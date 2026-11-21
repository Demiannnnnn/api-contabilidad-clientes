const tenantRepository = require('../repositories/tenantRepository');
const { validate, schemas } = require('./validationService');

class TenantService {
  async getTenant(tenantId) {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      const err = new Error('Tenant no encontrado');
      err.status = 404;
      throw err;
    }
    // Remove sensitive fields
    const { certificadoDigital, claveCertificado, flowApiKey, flowSecretKey, ...safe } = tenant;
    return safe;
  }

  async updateTenant(tenantId, data) {
    const validated = validate(schemas.tenantUpdate, data);
    return tenantRepository.update(tenantId, {
      razonSocial: validated.razon_social,
      nombreFantasia: validated.nombre_fantasia,
      giro: validated.giro,
      direccion: validated.direccion,
      comuna: validated.comuna,
      ciudad: validated.ciudad,
      region: validated.region,
      telefono: validated.telefono,
      email: validated.email,
    });
  }

  async updateSiiConfig(tenantId, data) {
    const validated = validate(schemas.tenantSiiConfig, data);
    return tenantRepository.updateSiiConfig(tenantId, {
      resolucionSii: validated.resolucion_sii,
      numeroResolucion: validated.numero_resolucion,
      fechaResolucion: validated.fecha_resolucion ? new Date(validated.fecha_resolucion) : undefined,
      ambienteSii: validated.ambiente_sii,
    });
  }
}

module.exports = new TenantService();
