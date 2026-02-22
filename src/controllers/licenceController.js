//Cliente valida su licencia
const validateLicence = (req, res) => {
    try
    {
        const { licenceKey, userId } = req.body;
        if (!licenceKey) {
            return res.status(400).json({ success: false, error: 'Licence key is required' });
        }
        const isValid = licenceService.validateLicence(userId, licenceKey);
        if (isValid) {
            res.json({ success: true, message: 'Licence is valid' });
        } else {
            res.status(401).json({ success: false, error: 'Invalid licence key' });
        }

    }catch(error){
        const status = error.status || 500;
        res.status(status).json({ success: false, error: error.message || 'Error al validar licencia' });
    }
}

//Cliente obtiene el estado de su licencia
const getLicenceStatus = (req, res) => {
    try{
        const userId = req.user.id;
        if(!userId){
            return res.status(400).json({success: false, error: 'userId es requerido'});
        }
        const status = licenceService.getLicenceStatus(userId);
        res.json({ success: true, status });   
    }catch(error){
        const status = error.status || 500;
        res.status(status).json({ success: false, error: error.message || 'Error al obtener estado de licencia' });
    }

}

//Cliente obtiene su licencia 
const getLicence= (req, res) => {
    try{
        const userId = req.user.id;
        if(!userId){
            return res.status(400).json({success: false, error: 'userId es requerido'});
        }
        const licence = licenceService.getLicence(userId);
        res.json({ success: true, licence });   
    }catch(error){
        const status = error.status || 500;
        res.status(status).json({ success: false, error: error.message || 'Error al obtener licencia' });
    }

}

//Cliente actualiza su licencia
const updateLicence = (req, res) => {
    try{
        const userId = req.user.id;
        const { licenceKey } = req.body;
        if(!userId){
            return res.status(400).json({success: false, error: 'userId es requerido'});
        }
        if(!licenceKey){
            return res.status(400).json({success: false, error: 'Licence key is required'});
        }
        const updatedLicence = licenceService.updateLicence(userId, licenceKey);
        res.json({ success: true, message: 'Licence updated successfully', licence: updatedLicence });
    }catch(error){
        const status = error.status || 500;
        res.status(status).json({ success: false, error: error.message || 'Error al actualizar licencia' });
    }
   
}


module.exports = {
    validateLicence,
    getLicenceStatus,
    getLicence,
    updateLicence
};