const ACCIONES_VALIDAS = new Set([
  "CREATE", "UPDATE", "DELETE", "ACTIVATE", "DEACTIVATE",
  "LOGIN", "LOGOUT", "ADVANCE", "REJECT",
  "UPLOAD", "NEW_VERSION", "DOWNLOAD", "RESPOND"
]);

const ENTIDADES_VALIDAS = new Set([
  "usuario", "area", "contratista", "disciplina", "categoria", "subtipo",
  "expediente", "documento", "formulario", "proceso", "etapa", "rol"
]);

function validateEventPayload(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Payload required");
  }
  if (!body.accion || !ACCIONES_VALIDAS.has(body.accion)) {
    throw new Error("Invalid accion");
  }
  if (!body.entidad || !ENTIDADES_VALIDAS.has(body.entidad)) {
    throw new Error("Invalid entidad");
  }
  if (body.usuario_nombre && body.usuario_nombre.length > 100) {
    throw new Error("usuario_nombre too long");
  }
  if (body.entidad_nombre && body.entidad_nombre.length > 200) {
    throw new Error("entidad_nombre too long");
  }
  if (body.ip && body.ip.length > 45) {
    throw new Error("ip too long");
  }
  return body;
}

function validateQueryFilters(query) {
  const filters = {};
  const allowedFilters = [
    "fecha_desde", "fecha_hasta", "usuario_id", "accion", "entidad", "limit", "offset"
  ];
  
  for (const key of allowedFilters) {
    if (query[key] !== undefined) {
      filters[key] = query[key];
    }
  }
  
  // Convert limit and offset to integers
  if (filters.limit) {
    filters.limit = parseInt(filters.limit, 10);
    if (isNaN(filters.limit) || filters.limit < 1) filters.limit = 50;
    if (filters.limit > 100) filters.limit = 100;
  } else {
    filters.limit = 50;
  }
  
  if (filters.offset) {
    filters.offset = parseInt(filters.offset, 10);
    if (isNaN(filters.offset) || filters.offset < 0) filters.offset = 0;
  } else {
    filters.offset = 0;
  }
  
  // Validate usuario_id is integer
  if (filters.usuario_id) {
    filters.usuario_id = parseInt(filters.usuario_id, 10);
    if (isNaN(filters.usuario_id)) {
      delete filters.usuario_id;
    }
  }
  
  return filters;
}

module.exports = {
  validateEventPayload,
  validateQueryFilters,
  ACCIONES_VALIDAS,
  ENTIDADES_VALIDAS
};