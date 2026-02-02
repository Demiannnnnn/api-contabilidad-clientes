const validateRegister = (req, res, next) => {
  res.json({ message: 'Validación de registro exitosa' });
  next();
}

const validateLogin = (req, res, next) => {
  res.json({ message: 'Validación de login exitosa' });
  next();
}

const validateChangePassword = (req, res, next) => {
  res.json({ message: 'Validación de cambio de contraseña exitosa' });
  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateChangePassword
};