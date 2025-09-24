const express = require('express');
const cors = require('cors');
// Agrega el cliente de PostgreSQL
const { Client } = require('pg');

const app = express();
// Middleware
app.use(cors());
app.use(express.json());

// Elimina las rutas a los archivos locales
// const fs = require('fs');
// const path = require('path');
// const dataFilePath = path.join(__dirname, 'negocios.json');

// Configura la conexión a la base de datos
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

// Conectar a la base de datos
client.connect()
  .then(() => {
    console.log('Conectado a la base de datos de Supabase');
  })
  .catch(err => {
    console.error('Error de conexión a la base de datos', err.stack);
  });

const PORT = process.env.PORT || 3000;

// Elimina las funciones para leer y escribir en el archivo JSON
// function readData() { ... }
// function writeData(data) { ... }

// ----------------------
// Definición de las API
// ----------------------

// API 1: Obtener todos los datos desde la base de datos
// La ruta es la misma, pero la lógica interna cambia
app.get('/api/datos', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM negocios');
    res.json({ negocios: result.rows });
  } catch (error) {
    console.error('Error al obtener datos de la base de datos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// API 2: Actualizar la lista de negocios (esta lógica puede ser más compleja
// dependiendo de cómo quieras manejar las actualizaciones)
app.put('/api/negocios', async (req, res) => {
  const nuevosNegocios = req.body.negocios;
  try {
    // Aquí puedes decidir cómo actualizar los datos.
    // Un enfoque simple es borrar los antiguos e insertar los nuevos.
    await client.query('DELETE FROM negocios');
    
    for (const negocio of nuevosNegocios) {
      await client.query(
        `INSERT INTO negocios(nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id) 
         VALUES($1, $2, $3, $4, $5, $6, $7)`,
        [negocio.nombre, negocio.telefono, negocio.rubro_id, negocio.enviado, negocio.pais_id, negocio.provincia_id, negocio.ciudad_id]
      );
    }

    res.status(200).json({ message: 'Datos de negocios actualizados con éxito' });
  } catch (error) {
    console.error('Error al actualizar datos de la base de datos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});