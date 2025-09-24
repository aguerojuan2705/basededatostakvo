const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Configura CORS para permitir peticiones solo desde tu frontend
const corsOptions = {
  origin: 'https://grupotakvo-fronted.onrender.com'
};
app.use(cors(corsOptions));

// Configura la conexión a la base de datos usando la variable de entorno
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

// ----------------------
// Definición de las API
// ----------------------

// API 1: Obtener todos los datos
app.get('/api/datos', async (req, res) => {
  try {
    const negociosResult = await client.query('SELECT * FROM negocios');
    const paisesResult = await client.query('SELECT * FROM paises');
    const provinciasResult = await client.query('SELECT * FROM provincias');
    const ciudadesResult = await client.query('SELECT * FROM ciudades');
    const rubrosResult = await client.query('SELECT * FROM rubros');

    // Estructurar los datos para el frontend
    const paises = paisesResult.rows.map(p => ({
      ...p,
      provincias: provinciasResult.rows.filter(prov => prov.pais_id === p.id).map(prov => ({
        ...prov,
        ciudades: ciudadesResult.rows.filter(c => c.provincia_id === prov.id)
      }))
    }));

    const rubros = rubrosResult.rows;

    res.json({
      negocios: negociosResult.rows,
      paises,
      rubros
    });
  } catch (error) {
    console.error('Error al obtener datos de la base de datos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// API 2: Actualizar o crear un negocio
app.put('/api/negocios', async (req, res) => {
  const { id, nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id } = req.body;
  try {
    if (id) {
      // Si el negocio ya tiene un ID, lo actualizamos
      const updateQuery = `
        UPDATE negocios
        SET nombre = $1, telefono = $2, rubro_id = $3, enviado = $4, pais_id = $5, provincia_id = $6, ciudad_id = $7
        WHERE id = $8
      `;
      await client.query(updateQuery, [nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id, id]);
      res.status(200).json({ message: 'Negocio actualizado con éxito' });
    } else {
      // Si es un nuevo negocio, lo insertamos sin un ID
      const insertQuery = `
        INSERT INTO negocios(nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id) 
        VALUES($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      const result = await client.query(insertQuery, [nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id]);
      res.status(201).json({ message: 'Negocio agregado con éxito', id: result.rows[0].id });
    }
  } catch (error) {
    console.error('Error al guardar el negocio en la base de datos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// API 3: Eliminar un negocio
app.delete('/api/negocios/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await client.query('DELETE FROM negocios WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount > 0) {
      res.status(200).json({ message: 'Negocio eliminado con éxito' });
    } else {
      res.status(404).json({ message: 'Negocio no encontrado' });
    }
  } catch (error) {
    console.error('Error al eliminar el negocio:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});