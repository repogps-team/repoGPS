# Spec: Email de invitación al crear usuario

## Dominio: notificaciones

---

## 1. Crear usuario con invitación (ms-usuarios)

### Escenario 1.1: Admin crea usuario — se genera inactivo con token

**Given** un admin autenticado en el sistema  
**When** envía `POST /api/usuarios` con `{ nombre_completo, correo, rol_id, area_id }`  
**Then** el usuario se guarda con:
- `estado_activo = false`
- `password_hash = NULL`
- `token_activacion` = UUID v4 generado automáticamente
- `token_expira_at` = NOW() + 48 horas

**And** la respuesta es `201 Created` con el usuario creado (sin exponer el token)
**And** NO se requiere password en el body de la request
**And** el correo debe ser único (misma validación existente)

### Escenario 1.2: Creación de usuario dispara evento a ms-notificaciones

**Given** un usuario recién creado con `token_activacion`  
**When** se completa la inserción en BD  
**Then** se ejecuta un fetch fire-and-forget a `POST http://ms-notificaciones:3003/api/eventos` con:
```json
{
  "tipo": "USUARIO_CREADO",
  "data": {
    "email": "juan@test.com",
    "nombre": "Juan Perez",
    "token_activacion": "uuid-generado"
  }
}
```

**And** si el fetch falla (timeout, conexión rechazada), se loguea el error pero NO se bloquea la respuesta al admin
**And** el admin recibe `201 Created` sin importar si el evento se envió o no

### Escenario 1.3: Validación — email duplicado

**Given** un usuario existente con correo `juan@test.com`  
**When** se intenta crear otro usuario con el mismo correo  
**Then** la respuesta es `400 Bad Request` con error de correo duplicado  
**And** NO se crea ningún registro

---

## 2. Activar cuenta (ms-usuarios)

### Escenario 2.1: Activación exitosa con token válido

**Given** un usuario inactivo con `token_activacion = "abc-123"` y `token_expira_at` en el futuro  
**When** se envía `POST /api/usuarios/activar` con `{ token: "abc-123", password: "MiPass123!" }`  
**Then** el sistema:
1. Busca el usuario por `token_activacion`
2. Verifica que `token_expira_at > NOW()`
3. Hashea la password con bcrypt (salt rounds = 10)
4. Actualiza: `password_hash`, `estado_activo = true`, `token_activacion = NULL`, `token_expira_at = NULL`
5. Responde `200 OK` con `{ message: "Cuenta activada" }`

### Escenario 2.2: Token inválido

**Given** un token que NO existe en la BD  
**When** se envía `POST /api/usuarios/activar` con ese token  
**Then** la respuesta es `400 Bad Request` con `{ error: "Token invalido" }`

### Escenario 2.3: Token expirado

**Given** un usuario con `token_expira_at` en el pasado (> 48h desde creación)  
**When** se envía `POST /api/usuarios/activar` con ese token  
**Then** la respuesta es `400 Bad Request` con `{ error: "Token expirado" }`

### Escenario 2.4: Activación no requiere autenticación

**Given** un usuario sin sesión activa (no tiene cuenta aún)  
**When** accede a `POST /api/usuarios/activar`  
**Then** el endpoint NO requiere JWT ni ningún header de autenticación

---

## 3. Recibir evento (ms-notificaciones)

### Escenario 3.1: Evento USUARIO_CREADO válido

**Given** el microservicio ms-notificaciones corriendo en puerto 3003  
**When** recibe `POST /api/eventos` con:
```json
{
  "tipo": "USUARIO_CREADO",
  "data": {
    "email": "juan@test.com",
    "nombre": "Juan Perez",
    "token_activacion": "abc-123"
  }
}
```
**Then** responde `202 Accepted` con `{ status: "evento recibido" }`
**And** guarda el evento en la tabla `eventos` con:
- `tipo = 'USUARIO_CREADO'`
- `data = { email, nombre, token_activacion }`
- `estado = 'pendiente'`
**And** encola el envío de email en Bull con cola `email` y job `enviar-invitacion`

### Escenario 3.2: Evento con tipo no soportado

**Given** el microservicio ms-notificaciones  
**When** recibe `POST /api/eventos` con `tipo: "TIPO_DESCONOCIDO"`  
**Then** responde `400 Bad Request` con `{ error: "Tipo no soportado" }`

### Escenario 3.3: Evento con datos incompletos

**Given** el microservicio ms-notificaciones  
**When** recibe `POST /api/eventos` sin `tipo` o sin `data.email`  
**Then** responde `400 Bad Request` con error de validación

---

## 4. Envío de email (ms-notificaciones — worker)

### Escenario 4.1: Email enviado exitosamente

**Given** un job `enviar-invitacion` en la cola Bull con datos de un usuario  
**When** el worker procesa el job  
**Then** envía un email via SMTP con Nodemailer a la dirección del usuario  
**And** el email contiene:
- **From**: `noreply@pacheco.cl`
- **Subject**: `Bienvenido a repoGPS — Activa tu cuenta`
- **Body HTML**: template con nombre del usuario y botón de activación
- **Link**: `https://pacheco.cl/activar?token={token}`
- **Expiración**: menciona que el link expira en 48 horas

**And** actualiza `eventos.estado = 'enviado'` y `eventos.enviado_at = NOW()`
**And** registra el envío en `email_logs` con estado `enviado`

### Escenario 4.2: Error en envío — reintento automático

**Given** un job de email que falla (SMTP rechaza conexión)  
**When** el worker intenta enviar y falla  
**Then** Bull reintenta automáticamente con backoff (máximo 3 intentos)
**And** después de 3 fallos, el job queda como `failed` en Bull
**And** `eventos.estado = 'error'` y `email_logs.estado = 'fallido'`
**And** se guarda el mensaje de error en `error_message`

---

## 5. Template de email

### Escenario 5.1: El HTML del email es responsivo y contiene

```
De: noreply@pacheco.cl
Para: {email del usuario}
Asunto: Bienvenido a repoGPS — Activa tu cuenta

[Cuerpo]
Hola {Nombre del usuario},

Se creó tu cuenta en repoGPS. Para empezar a usar la plataforma,
activa tu cuenta haciendo clic en el siguiente botón:

[Activar mi cuenta] ← botón estilizado

O copia este link: https://pacheco.cl/activar?token={token}

Este link expira en 48 horas.
```

---

## 6. Healthcheck y métricas

### Escenario 6.1: Healthcheck

**Given** ms-notificaciones corriendo  
**When** se accede a `GET /health`  
**Then** responde `200 OK` con `{ status: "ok" }`

### Escenario 6.2: Métricas Prometheus

**Given** ms-notificaciones corriendo  
**When** se accede a `GET /metrics`  
**Then** responde con métricas en formato Prometheus (prom-client)
**And** incluye al menos: `http_request_duration_seconds` (histograma)

### Escenario 6.3: Listar eventos (debug)

**Given** ms-notificaciones con eventos registrados  
**When** se accede a `GET /api/eventos`  
**Then** responde con array de eventos con su estado actual
