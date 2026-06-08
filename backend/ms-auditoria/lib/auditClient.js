const AUDITORIA_URL = process.env.MS_AUDITORIA_URL || "http://ms-auditoria:3004";

module.exports = {
  emitAudit: async (evento) => {
    const payload = {
      usuario_id: evento.usuario_id || null,
      usuario_nombre: evento.usuario_nombre || null,
      usuario_email: evento.usuario_email || null,
      accion: evento.accion,
      entidad: evento.entidad,
      entidad_id: evento.entidad_id || null,
      entidad_nombre: evento.entidad_nombre || null,
      valor_anterior: evento.valor_anterior || null,
      valor_nuevo: evento.valor_nuevo || null,
      ip: evento.ip || null,
      user_agent: evento.user_agent || null,
      metadata: evento.metadata || null,
    };

    fetch(`${AUDITORIA_URL}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  },
};