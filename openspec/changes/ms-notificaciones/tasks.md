# Tasks: ms-notificaciones — Email de invitación al crear usuario

---

## Fase 1: Infraestructura (BD, Docker, Nginx)

### 1.1 Schema de base de datos — db_notificaciones
- [ ] Crear `database/init_notificaciones.sql` con tablas `eventos` y `email_logs`
- [ ] Incluir índices y foreign key entre `email_logs.evento_id → eventos.id`

### 1.2 Migración de db_usuarios — columnas de activación
- [ ] Agregar a `database/init.sql`:
  - `token_activacion VARCHAR(255)` en tabla `usuarios`
  - `token_expira_at TIMESTAMP` en tabla `usuarios`
- [ ] NOTA: La columna `password_hash` debe pasar a aceptar NULL (para usuarios sin activar)

### 1.3 docker-compose.yml — agregar servicios
- [ ] Agregar servicio `redis:7-alpine` con network `app-network`
- [ ] Agregar servicio `db_notificaciones` (postgres:15) con volumen `pgdata_notificaciones`
- [ ] Agregar servicio `ms-notificaciones` apuntando a imagen ghcr.io
- [ ] Agregar `pgdata_notificaciones` a `volumes:`
- [ ] Agregar `ms-notificaciones` y `redis` a `depends_on` de nginx

### 1.4 docker-compose.local.yml — override para dev
- [ ] Agregar override de `ms-notificaciones` con node:18-alpine y volume mount
- [ ] Agregar override de `redis` si es necesario

### 1.5 nginx/nginx.conf — ruta para notificaciones
- [ ] Agregar `location /api/notificaciones` → `http://ms-notificaciones:3003`
- [ ] Agregar `location /notificaciones/metrics` → `http://ms-notificaciones:3003/metrics`

### 1.6 prometheus/prometheus.yml — scraping
- [ ] Agregar job `ms-notificaciones` apuntando a `ms-notificaciones:3003`

---

## Fase 2: Implementación — ms-notificaciones (NUEVO)

### 2.1 Crear estructura del proyecto
- [ ] Crear `backend/ms-notificaciones/package.json` con dependencias:
  - express, cors, pg, prom-client, bull, nodemailer, dotenv
- [ ] Crear `backend/ms-notificaciones/Dockerfile` (node:18-alpine, patrón existente)
- [ ] Crear `backend/ms-notificaciones/src/metrics.js` (copiar patrón de ms-mantenedor)

### 2.2 Endpoint POST /api/eventos
- [ ] Validar campos requeridos: `tipo` y `data`
- [ ] Validar que `tipo` sea uno de los soportados (`USUARIO_CREADO`)
- [ ] Validar que `data.email` exista
- [ ] Insertar evento en tabla `eventos` con estado `pendiente`
- [ ] Encolar job en Bull para envío de email
- [ ] Responder `202 Accepted`

### 2.3 Endpoint GET /api/eventos (debug)
- [ ] Query a tabla `eventos` ordenado por `created_at DESC`
- [ ] Responder con array de eventos
- [ ] Limitar a últimos 100 registros

### 2.4 Healthcheck GET /health
- [ ] Responder `200 OK` con `{ status: "ok" }`

### 2.5 Worker de Bull — procesar emails
- [ ] Configurar cola `email` con conexión Redis
- [ ] Configurar worker para procesar jobs `enviar-invitacion`
- [ ] En el worker: leer `emailService.js` y enviar email
- [ ] Actualizar `eventos.estado = 'enviado'` y `email_logs` al completar
- [ ] Manejar errores: registrar en `error_message`, Bull reintenta automáticamente
- [ ] Configurar max 3 intentos con backoff exponencial

### 2.6 Servicio de email (Nodemailer) — src/emailService.js
- [ ] Crear transporter SMTP con variables de entorno
- [ ] Función `sendInvitationEmail({ to, nombre, token })`:
  - Generar HTML con template
  - Enviar via transporter
  - Retornar éxito/error

### 2.7 Template de email — src/emailTemplate.js
- [ ] Función `buildInvitationEmail({ nombre, token, frontendUrl })`:
  - Retornar objeto `{ subject, html }`
  - HTML responsivo inline
  - Botón estilizado con link: `{frontendUrl}/activar?token={token}`
  - Texto: "Este link expira en 48 horas"

### 2.8 Endpoint GET /metrics
- [ ] Copiar patrón de metrics.js existente
- [ ] Registrar histograma `http_request_duration_seconds`

---

## Fase 3: Implementación — ms-usuarios (MODIFICAR)

### 3.1 Modificar POST /api/usuarios
- [ ] Cambiar `estado_activo` default a `false`
- [ ] Generar `token_activacion = crypto.randomUUID()`
- [ ] Setear `token_expira_at = NOW() + 48 hours`
- [ ] Hacer `password_hash` opcional en el body (o ignorarlo)
- [ ] NO incluir `token_activacion` en la respuesta al admin

### 3.2 Agregar emisión de evento fire-and-forget
- [ ] Después de insertar usuario y áreas, llamar a `enviarEvento()`
- [ ] Función `enviarEvento(tipo, data)` en helpers:
  ```javascript
  const MS_NOTIFICACIONES_URL = process.env.MS_NOTIFICACIONES_URL 
    || 'http://ms-notificaciones:3003';
  
  const enviarEvento = async (tipo, data) => {
    try {
      await fetch(`${MS_NOTIFICACIONES_URL}/api/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, data })
      });
    } catch (err) {
      console.error('Error enviando notificacion:', err.message);
    }
  };
  ```
- [ ] Llamar con tipo `USUARIO_CREADO` y data `{ email, nombre_completo, token_activacion }`
- [ ] NO bloquear la respuesta si falla

### 3.3 Nuevo endpoint POST /api/usuarios/activar
- [ ] Ruta: `POST /api/usuarios/activar`
- [ ] Sin autenticación (cualquiera con token puede activar)
- [ ] Validar: `token` requerido, `password` requerido, min 6 caracteres
- [ ] Buscar usuario por `token_activacion`
- [ ] Validar que `token_expira_at > NOW()`
- [ ] Hashear password con bcrypt (salt rounds = 10, como en login)
- [ ] UPDATE: `password_hash`, `estado_activo = true`, `token_activacion = NULL`, `token_expira_at = NULL`
- [ ] Responder `{ message: "Cuenta activada" }`
- [ ] Si token inválido → 400 "Token invalido"
- [ ] Si token expirado → 400 "Token expirado"

### 3.4 Agregar MS_NOTIFICACIONES_URL a ms-usuarios
- [ ] Variable de entorno en `docker-compose.yml` para ms-usuarios
- [ ] Variable de entorno en `docker-compose.local.yml` si aplica

---

## Fase 4: Verificación

### 4.1 Verificar estructura
- [ ] Todos los archivos del nuevo MS existen
- [ ] Dockerfile tiene EXPOSE 3003
- [ ] package.json tiene todas las dependencias

### 4.2 Verificar cambios en BD
- [ ] init.sql tiene las nuevas columnas
- [ ] init_notificaciones.sql existe con tablas correctas

### 4.3 Verificar infraestructura
- [ ] docker-compose.yml tiene todos los servicios nuevos
- [ ] nginx.conf tiene las rutas nuevas
- [ ] prometheus.yml tiene el job nuevo

### 4.4 Verificar integración
- [ ] POST /api/usuarios crea usuario inactivo
- [ ] POST /api/usuarios dispara evento a ms-notificaciones
- [ ] POST /api/eventos recibe y encola
- [ ] Worker procesa y envía email
- [ ] POST /api/usuarios/activar activa cuenta
