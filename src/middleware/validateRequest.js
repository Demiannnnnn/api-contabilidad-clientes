
const validateRegister = (req, res, next) => {
  if (!req.body.email || !req.body.password || !req.body.rut) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: email, password y rut' });
  }
  next();
}

const validateLogin = (req, res, next) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: email y password' });
  }
  next();
}

const validateChangePassword = (req, res, next) => {
  if (!req.body.oldPassword || !req.body.newPassword) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateChangePassword
};