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
    const result = await client.query('SELECT * FROM negocios');
    const negocios = result.rows;
    // Debes obtener también los datos de países, provincias, ciudades y rubros
    const paisesResult = await client.query('SELECT * FROM paises');
    const provinciasResult = await client.query('SELECT * FROM provincias');
    const ciudadesResult = await client.query('SELECT * FROM ciudades');
    const rubrosResult = await client.query('SELECT * FROM rubros');

    // Estructura los datos para el frontend
    const paises = paisesResult.rows.map(p => ({
        ...p,
        provincias: provinciasResult.rows.filter(prov => prov.pais_id === p.id).map(prov => ({
            ...prov,
            ciudades: ciudadesResult.rows.filter(c => c.provincia_id === prov.id)
        }))
    }));

    const rubros = rubrosResult.rows;

    res.json({ negocios, paises, rubros });
  } catch (error) {
    console.error('Error al obtener datos de la base de datos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// API 2: Actualizar la lista de negocios
app.put('/api/negocios', async (req, res) => {
  const nuevosNegocios = req.body;
  try {
    // Usamos una transacción para asegurar la consistencia
    await client.query('BEGIN');
    await client.query('DELETE FROM negocios');
    
    for (const negocio of nuevosNegocios) {
      await client.query(
        `INSERT INTO negocios(id, nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id) 
         VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
        [negocio.id, negocio.nombre, negocio.telefono, negocio.rubro_id, negocio.enviado, negocio.pais_id, negocio.provincia_id, negocio.ciudad_id]
      );
    }
    
    await client.query('COMMIT');
    res.status(200).json({ message: 'Datos de negocios actualizados con éxito' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar datos de la base de datos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});