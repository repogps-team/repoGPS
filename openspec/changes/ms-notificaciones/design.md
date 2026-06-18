# Design: ms-notificaciones — Email de invitación al crear usuario

## Arquitectura general

```
┌──────────────┐     POST /api/eventos     ┌──────────────────┐
│  ms-usuarios │ ─────────────────────────► │  ms-notificaciones│
│  (:3000)     │   fire-and-forget         │  (:3003)          │
└──────────────┘                            └────────┬─────────┘
                                                     │
                                           ┌─────────▼─────────┐
                                           │   Bull Queue      │
                                           │   (Redis)         │
                                           └─────────┬─────────┘
                                                     │
                                           ┌─────────▼─────────┐
                                           │   Worker Process  │
                                           │   (Nodemailer)    │
                                           └─────────┬─────────┘
                                                     │
                                           ┌─────────▼─────────┐
                                           │      SMTP         │
                                           │   (Mail server)   │
                                           └───────────────────┘
```

## Diagrama de secuencia

```
Admin          Frontend         ms-usuarios      ms-notificaciones    Redis          SMTP
  │                │                  │                    │             │             │
  │  Crear usuario │                  │                    │             │             │
  │ ─────────────► │  POST /api/      │                    │             │             │
  │                │  usuarios        │                    │             │             │
  │                │ ────────────────►│                    │             │             │
  │                │                  │                    │             │             │
  │                │                  │  INSERT usuario    │             │             │
  │                │                  │  (inactivo, token) │             │             │
  │                │                  │                    │             │             │
  │                │                  │  POST /api/eventos │             │             │
  │                │                  │ ──────────────────►│             │             │
  │                │                  │                    │             │             │
  │                │                  │                    │  INSERT     │             │
  │                │                  │                    │  eventos    │             │
  │                │                  │                    │             │             │
  │                │                  │                    │  ADD job    │             │
  │                │                  │                    │ ───────────►│             │
  │                │                  │                    │             │             │
  │                │  201 Created     │                    │             │             │
  │                │ ◄───────────────│ 202 Accepted        │             │             │
  │ ◄─────────────│                  │ ◄──────────────────│             │             │
  │                │                  │                    │             │             │
  │                │                  │                    │  (async)    │             │
  │                │                  │                    │  PROCESS    │             │
  │                │                  │                    │ ◄───────────│             │
  │                │                  │                    │             │             │
  │                │                  │                    │  EMAIL ────►│ ───────────►│
  │                │                  │                    │             │             │
  │                │                  │                    │  UPDATE     │             │
  │                │                  │                    │  estado     │             │
  │                │                  │                    │             │             │
```

## Decisiones de arquitectura

### AD-1: Express con patrón monolithic (como los otros MS)
- **Decisión**: Usar Express en un solo archivo `index.js` con helpers en `src/`
- **Por qué**: Todos los MS del proyecto siguen este patrón. No hay razón para overcomplicar.
- **Consecuencia**: Si crece mucho, se puede separar en rutas/router.

### AD-2: Bull + Redis para cola de emails
- **Decisión**: Usar Bull para encolar los envíos de email
- **Por qué**: El envío de email es lento (~500ms-2s). No queremos que bloquee el POST /api/eventos.
- **Alternativa**: Envío directo con Nodemailer sin cola. Se pierde reintento automático.
- **Reintentos**: Bull configurado con 3 intentos, backoff exponencial.

### AD-3: Fire-and-forget desde ms-usuarios
- **Decisión**: `ms-usuarios` no espera respuesta de `ms-notificaciones`
- **Por qué**: La creación del usuario no DEBE depender de que el email se envíe. El admin necesita una respuesta rápida.
- **Trade-off**: Si `ms-notificaciones` está caído, el evento se pierde. Mitigación futura: job programado de reintento.

### AD-4: Token UUID v4 con expiración de 48h
- **Decisión**: `token_activacion` = UUID v4, `token_expira_at` = NOW() + 48h
- **Por qué**: UUID v4 no es adivinable. 48h da tiempo suficiente sin ser un riesgo de seguridad.
- **Almacenamiento**: Se guarda en `ms-usuarios` (db_usuarios), no en `ms-notificaciones`.

### AD-5: Template HTML inline en código
- **Decisión**: El template del email va como string HTML en el código (o archivo aparte en `src/`)
- **Por qué**: Solo hay UN template por ahora. Handlebars sería over-engineering.
- **Futuro**: Si hay más templates, se puede migrar a Handlebars.

### AD-6: PostgreSQL como store de eventos
- **Decisión**: Guardar todos los eventos recibidos en `db_notificaciones`
- **Por qué**: Trazabilidad y debugging. Coincide con el stack del proyecto.
- **No usar Redis como store principal**: Redis es volátil, PostgreSQL es durable.

### AD-7: Puerto 3003 para ms-notificaciones
- **Decisión**: Usar puerto 3003
- **Por qué**: Convención del proyecto (3000=usuarios, 3001=mantenedor, 3002=expedientes, 3004=auditoría, 3003=notificaciones)

## Estructura del nuevo MS

```
backend/ms-notificaciones/
├── Dockerfile
├── index.js              ← API + worker (mismo proceso)
├── package.json
└── src/
    ├── metrics.js        ← prom-client (patrón existente)
    ├── emailService.js   ← Nodemailer config + envío
    └── emailTemplate.js  ← Template HTML del email
```

**Nota**: El worker de Bull corre en el mismo proceso que Express. Para un MS tan simple no justifica separarlos.

## Schema de la BD (db_notificaciones)

```sql
-- database/init_notificaciones.sql

CREATE TABLE eventos (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    intentos INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    enviado_at TIMESTAMP
);

CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    evento_id INTEGER REFERENCES eventos(id),
    para VARCHAR(100) NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    enviado_at TIMESTAMP
);

CREATE INDEX idx_eventos_tipo ON eventos(tipo);
CREATE INDEX idx_eventos_estado ON eventos(estado);
CREATE INDEX idx_email_logs_estado ON email_logs(estado);
```

## Variables de entorno (ms-notificaciones)

```
PORT=3003

DB_USER=postgres
DB_HOST=db_notificaciones
DB_NAME=db_notificaciones
DB_PASSWORD=password123
DB_PORT=5432

REDIS_HOST=redis
REDIS_PORT=6379

SMTP_HOST=smtp.pacheco.cl
SMTP_PORT=587
SMTP_USER=noreply@pacheco.cl
SMTP_PASS=  ← configurar en producción
SMTP_FROM=noreply@pacheco.cl

FRONTEND_URL=https://pacheco.cl
```

## Variables de entorno (ms-usuarios — agregar)

```
MS_NOTIFICACIONES_URL=http://ms-notificaciones:3003
```

## Endpoints

### ms-notificaciones

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | /api/eventos | Recibir evento | No (solo red interna) |
| GET | /api/eventos | Listar eventos (debug) | No |
| GET | /health | Healthcheck | No |
| GET | /metrics | Métricas Prometheus | No |

### ms-usuarios (nuevos)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | /api/usuarios/activar | Activar cuenta con token | No |

## Configuración Bull

```javascript
const Queue = require('bull');
const emailQueue = new Queue('email', {
  redis: { host: process.env.REDIS_HOST || 'redis', port: process.env.REDIS_PORT || 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000  // 5s, 10s, 20s
    }
  }
});
```

## Integración con docker-compose

### Nuevos servicios

```yaml
redis:
  image: redis:7-alpine
  container_name: redis
  networks:
    - app-network

db_notificaciones:
  image: postgres:15
  container_name: db_notificaciones
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: password123
    POSTGRES_DB: db_notificaciones
  volumes:
    - ./database/init_notificaciones.sql:/docker-entrypoint-initdb.d/init_notificaciones.sql
    - pgdata_notificaciones:/var/lib/postgresql/data
  networks:
    - app-network

ms-notificaciones:
  image: ghcr.io/repogps-team/repogps/repogps-ms-notificaciones:latest
  container_name: ms-notificaciones
  environment:
    - PORT=3003
    - DB_USER=postgres
    - DB_HOST=db_notificaciones
    - DB_NAME=db_notificaciones
    - DB_PASSWORD=password123
    - DB_PORT=5432
    - REDIS_HOST=redis
    - REDIS_PORT=6379
    - SMTP_HOST=smtp.pacheco.cl
    - SMTP_PORT=587
    - SMTP_FROM=noreply@pacheco.cl
    - FRONTEND_URL=https://pacheco.cl
  depends_on:
    - db_notificaciones
    - redis
  networks:
    - app-network
```

### Nueva dependencia en nginx

```yaml
- ms-notificaciones
```
