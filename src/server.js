const express = require('express');
const server = express();
require ('dotenv').config();


const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

//middlewares globables
server.use(express.json());
server.use(express.urlencoded({ extended: true }));



//importar rutas
const authRoutes = require ('./routes/authRoutes');
const clienteRoutes =  require ('./routes/clienteRoutes');
const productoRoutes =  require ('./routes/productoRoutes');
const facturaRoutes = require ('./routes/facturaRoutes');
const licenceRoutes =  require ('./routes/licenceRoutes');
const updateRoutes =  require ('./routes/updateRoutes');

//Usar rutas
server.use('/api/auth', authRoutes);
server.use('/api', clienteRoutes);
server.use('/api', productoRoutes);
server.use('/api', facturaRoutes);
server.use('/api', licenceRoutes);
server.use('/api', updateRoutes);


//ruta prueba
server.get('/', (req, res) => {
  res.send('Servidor de API funcionando correctamente');
});

//manejo de errores globales
server.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Ocurrió un error en el servidor.' });
});


server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
}









);
