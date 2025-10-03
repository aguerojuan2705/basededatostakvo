const express = require('express');
const cors = require('cors');
// Usamos Pool para todas las operaciones (mejor práctica para Express)
const { Pool } = require('pg'); 

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
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Configuración SSL necesaria si Supabase lo requiere y Render lo maneja
  // ssl: { rejectUnauthorized: false } 
});

// Intentamos conectar el pool para verificar la conexión inicial
pool.connect()
  .then(conn => {
    console.log('Pool de conexión a la base de datos de Supabase inicializado correctamente.');
    conn.release(); // Liberar la conexión inmediatamente
  })
  .catch(err => {
    console.error('Error FATAL de conexión a la base de datos', err.stack);
    // Es importante que el servidor pueda seguir funcionando, aunque las APIs fallen.
  });


// Middleware para obtener conexión del pool en cada solicitud (aunque no es estrictamente necesario, es más robusto)
// Usamos el pool directamente en las funciones asíncronas

// ----------------------
// Definición de las API
// ----------------------

// API 1: Obtener todos los datos
app.get('/api/datos', async (req, res) => {
  let client;
  try {
    client = await pool.connect(); // Obtener una conexión del pool

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
  } finally {
    if (client) client.release(); // Liberar la conexión
  }
});

// API 2: Actualizar o crear un negocio (CORREGIDO: Conversión a minúsculas para IDs foráneos)
app.put('/api/negocios', async (req, res) => {
  let client;
  const { id, nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id } = req.body;

  // 1. Estandarizar IDs a minúsculas para prevenir errores de clave foránea
  const formatted_pais_id = pais_id ? String(pais_id).toLowerCase() : null;
  const formatted_provincia_id = provincia_id ? String(provincia_id).toLowerCase() : null;
  const formatted_ciudad_id = ciudad_id ? String(ciudad_id).toLowerCase() : null;
  // Asumiendo que rubro_id también es un string que podría beneficiarse de toLowerCase()
  const formatted_rubro_id = rubro_id ? String(rubro_id).toLowerCase() : null;

  try {
    client = await pool.connect(); // Obtener una conexión del pool
    
    if (id) {
      // Si el negocio ya tiene un ID, lo actualizamos
      const updateQuery = `
        UPDATE negocios
        SET nombre = $1, telefono = $2, rubro_id = $3, enviado = $4, pais_id = $5, provincia_id = $6, ciudad_id = $7
        WHERE id = $8
      `;
      await client.query(updateQuery, [
        nombre, 
        telefono, 
        formatted_rubro_id, 
        enviado, 
        formatted_pais_id, 
        formatted_provincia_id, 
        formatted_ciudad_id, 
        id
      ]);
      res.status(200).json({ message: 'Negocio actualizado con éxito' });
    } else {
      // Si es un nuevo negocio, lo insertamos
      const insertQuery = `
        INSERT INTO negocios(nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id, recontacto_contador, ultima_fecha_contacto) 
        VALUES($1, $2, $3, $4, $5, $6, $7, 0, NULL)
        RETURNING id
      `;
      const result = await client.query(insertQuery, [
        nombre, 
        telefono, 
        formatted_rubro_id, 
        enviado, 
        formatted_pais_id, 
        formatted_provincia_id, 
        formatted_ciudad_id
      ]);
      res.status(201).json({ message: 'Negocio agregado con éxito', id: result.rows[0].id });
    }
  } catch (error) {
    console.error('Error al guardar el negocio en la base de datos:', error);
    // Si ves el error de clave foránea aquí, es probable que los IDs aún no coincidan con las tablas maestras
    res.status(500).json({ error: 'Error del servidor al guardar el negocio. Verifique IDs de país/provincia/ciudad.' });
  } finally {
    if (client) client.release(); // Liberar la conexión
  }
});

// API 3: Eliminar un negocio
app.delete('/api/negocios/:id', async (req, res) => {
  let client;
  const id = req.params.id;
  try {
    client = await pool.connect(); // Obtener una conexión del pool
    
    const result = await client.query('DELETE FROM negocios WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount > 0) {
      res.status(200).json({ message: 'Negocio eliminado con éxito' });
    } else {
      res.status(404).json({ message: 'Negocio no encontrado' });
    }
  } catch (error) {
    console.error('Error al eliminar el negocio:', error);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    if (client) client.release(); // Liberar la conexión
  }
});

// API 4: Registrar un Recontacto y actualizar el contador
app.post('/api/negocios/registrar-contacto', async (req, res) => {
    const { id, medio, notas } = req.body; 

    if (!id || !medio || !notas) {
        return res.status(400).json({ 
            message: 'Faltan parámetros requeridos (id del negocio, medio, notas).' 
        });
    }

    // Usamos una conexión del pool para la transacción (más seguro)
    let connection;
    try {
        connection = await pool.connect();
        await connection.query('BEGIN'); // Iniciar transacción

        // 1. Insertar el registro en historial_interacciones
        const insertHistoryQuery = `
            INSERT INTO historial_interacciones (negocios_id, fecha_interaccion, medio, notas)
            VALUES ($1, NOW(), $2, $3)
            RETURNING *;
        `;
        // Utilizamos 'negocios_id' para coincidir con la tabla (asumiendo corrección)
        await connection.query(insertHistoryQuery, [id, medio, notas]);

        // 2. Actualizar el negocio principal (contador y fecha)
        const updateBusinessQuery = `
            UPDATE negocios
            SET 
                recontacto_contador = COALESCE(recontacto_contador, 0) + 1,
                ultima_fecha_contacto = NOW() 
            WHERE id = $1;
        `;
        await connection.query(updateBusinessQuery, [id]);

        await connection.query('COMMIT'); // Finalizar transacción

        res.status(200).json({ 
            message: 'Recontacto registrado y contador actualizado con éxito.' 
        });

    } catch (error) {
        if (connection) {
            await connection.query('ROLLBACK'); // Deshacer en caso de error
        }
        console.error('Error al registrar contacto en el servidor:', error);
        res.status(500).json({ 
            error: 'Error del servidor al registrar el contacto. Verifique el ID o la base de datos.', 
            details: error.message 
        });
    } finally {
        if (connection) {
            connection.release(); // Liberar la conexión
        }
    }
});

// API 5: Obtener historial de interacciones
app.get('/api/negocios/historial/:id', async (req, res) => {
    let client;
    const negocioId = req.params.id; 
    try {
        client = await pool.connect(); // Obtener una conexión del pool

        const query = `
            SELECT fecha_interaccion, medio, notas 
            FROM historial_interacciones 
            WHERE negocios_id = $1 
            ORDER BY fecha_interaccion DESC;
        `;
        const result = await client.query(query, [negocioId]);
        
        res.status(200).json({ historial: result.rows });
    } catch (error) {
        console.error('Error al obtener el historial:', error);
        res.status(500).json({ error: 'Error del servidor al obtener historial' });
    } finally {
        if (client) client.release(); // Liberar la conexión
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
