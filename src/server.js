const express = require('express');
const server = express();
require ('dotenv').config();

//middlewares globables
server.use(express.json());
server.use(express.urlencoded({ extended: true }));




const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});
