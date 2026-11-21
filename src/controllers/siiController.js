// SII Stubs — Real implementation pending SII integration

const enviarDte = async (req, res) => {
  try {
    // TODO: Implement real SII communication
    const { documento_id } = req.body;
    res.json({
      success: true,
      data: {
        trackId: `TRACK-${Date.now()}`,
        estado: 'ENVIADO',
        mensaje: 'Stub: DTE encolado para envío al SII',
        documento_id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const consultarEstado = async (req, res) => {
  try {
    const { trackId } = req.params;
    res.json({
      success: true,
      data: {
        trackId,
        estado: 'ACEPTADO',
        glosa: 'Stub: Documento aceptado por el SII',
        fechaRespuesta: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const generarPdf = async (req, res) => {
  try {
    const { folio } = req.params;
    res.json({
      success: true,
      data: {
        folio,
        pdfUrl: null,
        mensaje: 'Stub: Generación de PDF con timbre SII pendiente de implementar'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const firmarXml = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        firmado: false,
        mensaje: 'Stub: Firma XML con certificado digital pendiente de implementar'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const obtenerToken = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        token: null,
        mensaje: 'Stub: Obtención de token SII (semilla) pendiente de implementar'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { enviarDte, consultarEstado, generarPdf, firmarXml, obtenerToken };
