const validateRegister = (req, res, next) => {

  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  else{
    return res.status(400).json({ error: 'a' });
  }
  next();
}

const validateLogin = (req, res, next) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
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