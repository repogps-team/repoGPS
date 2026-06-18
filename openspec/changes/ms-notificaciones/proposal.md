# Proposal: ms-notificaciones — Email de invitación al crear usuario

## Resumen

Crear un nuevo microservicio `ms-notificaciones` que se encargue de enviar emails transaccionales, comenzando con el caso de uso "Email de invitación al crear usuario". Este MS recibe eventos de otros microservicios via HTTP, los encola con Bull+Redis, y envía los emails via SMTP con Nodemailer.

## Problema

Hoy, cuando un admin crea un usuario via `POST /api/usuarios`:
1. El usuario se guarda con `estado_activo = true` y una password hardcodeada
2. La persona NUNCA se entera de que tiene cuenta
3. El admin tiene que avisarle por WhatsApp, email manual, o en persona
4. Si el admin se olvida, el usuario queda como "fantasma" en el sistema

## Solución

Flujo nuevo:
1. Admin crea usuario → `ms-usuarios` lo guarda **inactivo** con `token_activacion` UUID
2. `ms-usuarios` emite evento fire-and-forget a `ms-notificaciones:3003/api/eventos`
3. `ms-notificaciones` recibe el evento, lo guarda en BD, lo encola con Bull+Redis
4. Redis worker envía el email via SMTP con link de activación
5. Usuario recibe email, hace clic en link → frontend muestra pantalla para crear password
6. Usuario envía `POST /api/usuarios/activar` con token + password → cuenta activada

## Microservicios afectados

| Microservicio | Cambio | Tipo |
|--------------|--------|------|
| **ms-notificaciones** (NUEVO) | Creación completa | 🆕 Nuevo |
| **ms-usuarios** | Modificar POST /api/usuarios + nuevo POST /api/usuarios/activar | 🔧 Modificar |

## Infraestructura afectada

| Componente | Cambio |
|-----------|--------|
| docker-compose.yml | Agregar `ms-notificaciones`, `db_notificaciones`, `redis` |
| docker-compose.local.yml | Agregar overrides para dev local |
| nginx/nginx.conf | Agregar ruta `/api/notificaciones` → `:3003` |
| database/init.sql | Agregar columnas `token_activacion`, `token_expira_at` |
| database/init_notificaciones.sql | (NUEVO) Schema de db_notificaciones |
| prometheus/prometheus.yml | Agregar job de scraping para ms-notificaciones |

## Stack tecnológico

| Componente | Tecnología | Por qué |
|-----------|-----------|---------|
| API HTTP | Express 4/5 (Node.js) | Coincide con el stack existente |
| Cola de emails | Bull + Redis | Reintento automático si SMTP falla |
| Email | Nodemailer + SMTP | Estándar, soporta cualquier proveedor |
| BD | PostgreSQL (db_notificaciones) | Coincide con el stack existente |
| Templates | HTML inline en código | Simple, sin dependencias extra |
| Métricas | prom-client | Coincide con el patrón existente |

## Lo que NO incluye esta propuesta

- ❌ Notificaciones en tiempo real (WebSocket)
- ❌ Notificaciones push del navegador
- ❌ Chat interno
- ❌ Reemplazo de ms-auditoria
- ❌ Cambios en lógica de negocio de ms-usuarios (solo agrega eventos fire-and-forget)

## Riesgos

- **Redis como dependencia**: Si no se quiere Redis, se puede simplificar a envío directo con Nodemailer (sin cola)
- **Fire-and-forget**: Si `ms-notificaciones` no responde, el evento se pierde. Mitigación: se puede reintentar desde `ms-usuarios` con un job programado como mejora futura
- **Token expiration**: Los tokens expiran en 48h. Si el usuario no activa su cuenta en ese plazo, el admin debe reenviar la invitación
