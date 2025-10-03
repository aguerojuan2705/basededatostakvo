const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

// ==============================================
// CONFIGURACIÓN DE CONEXIÓN (MANTÉN ESTO ARRIBA)
// ==============================================
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect()
    .then(() => console.log('Conectado a PostgreSQL'))
    .catch(err => console.error('Error de conexión a PostgreSQL', err));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Permite peticiones desde el frontend de Render
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('API de gestión de negocios funcionando.');
});

// ==============================================
// RUTAS API ESTABLES
// ==============================================

// API 1: Obtener todos los datos (Usando query EXPLÍCITA y ESTABLE)
app.get('/api/datos', async (req, res) => {
    try {
        // Seleccionamos SÓLO las columnas que sabemos que existen y son necesarias.
        const negociosQuery = `
            SELECT 
                id, 
                nombre, 
                telefono, 
                rubro_id, 
                enviado, 
                pais_id, 
                provincia_id, 
                ciudad_id,
                recontacto_contador,
                ultima_fecha_contacto
            FROM negocios;
        `;
        const negociosResult = await client.query(negociosQuery);
        
        // El resto de queries permanece igual
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


// API 2: Actualizar o crear un negocio (INSERCIÓN CORREGIDA)
app.put('/api/negocios', async (req, res) => {
    const { id, nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id } = req.body;
    try {
        if (id) {
            // Edición (UPDATE)
            const updateQuery = `
                UPDATE negocios
                SET nombre = $1, telefono = $2, rubro_id = $3, enviado = $4, pais_id = $5, provincia_id = $6, ciudad_id = $7
                WHERE id = $8
            `;
            await client.query(updateQuery, [nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id, id]);
            res.status(200).json({ message: 'Negocio actualizado con éxito' });
        } else {
            // Creación (INSERT): Incluye recontacto_contador y ultima_fecha_contacto con valores iniciales
            const insertQuery = `
                INSERT INTO negocios(
                    nombre, 
                    telefono, 
                    rubro_id, 
                    enviado, 
                    pais_id, 
                    provincia_id, 
                    ciudad_id,
                    recontacto_contador,         
                    ultima_fecha_contacto         
                ) 
                VALUES(
                    $1, $2, $3, $4, $5, $6, $7, 
                    0,                            
                    NULL                         
                )
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


// API 3: Eliminar negocio
app.delete('/api/negocios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await client.query('DELETE FROM negocios WHERE id = $1', [id]);
        res.status(200).json({ message: `Negocio con ID ${id} eliminado con éxito` });
    } catch (error) {
        console.error('Error al eliminar negocio:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});


// API 4: Registrar un nuevo recontacto
app.post('/api/negocios/registrar-contacto', async (req, res) => {
    // Extrae los datos del cuerpo de la petición.
    const { id, medio, notas } = req.body; 

    // Validación básica para evitar errores 500 innecesarios
    if (!id || !medio || !notas) {
        return res.status(400).json({ error: 'Faltan datos requeridos (id del negocio, medio o notas).' });
    }

    let client;
    try {
        // Asumiendo que tu cliente de conexión a DB se llama 'client' (como en el código completo que te envié)
        // Si usas un pool de conexiones, reemplaza 'client' por 'pool.connect()' y 'client.release()'
        
        // --- COMIENZA LA TRANSACCIÓN ---
        await client.query('BEGIN'); 

        // 1. Insertar el registro en la tabla 'historial_interacciones' (Tu nombre de tabla)
        const insertHistoryQuery = `
            INSERT INTO historial_interacciones (negocio_id, fecha_interaccion, medio, notas)
            VALUES ($1, NOW(), $2, $3)
            RETURNING *;
        `;
        await client.query(insertHistoryQuery, [id, medio, notas]);

        // 2. Actualizar el negocio principal en la tabla 'negocios'
        // Esto incrementa el contador y actualiza la fecha.
        const updateBusinessQuery = `
            UPDATE negocios
            SET 
                recontacto_contador = COALESCE(recontacto_contador, 0) + 1,
                ultima_fecha_contacto = NOW() 
            WHERE id = $1
            RETURNING recontacto_contador, ultima_fecha_contacto;
        `;
        const updateResult = await client.query(updateBusinessQuery, [id]);

        if (updateResult.rowCount === 0) {
             throw new Error("No se encontró el negocio para actualizar.");
        }

        await client.query('COMMIT'); // Confirmar que ambos pasos se realizaron

        // Respuesta exitosa
        res.json({ 
            message: 'Recontacto registrado con éxito.', 
            updatedNegocio: updateResult.rows[0] 
        });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK'); // Deshacer en caso de error
        }
        console.error('Error al registrar contacto en el servidor:', error);
        
        // Devolver un error específico para ayudarte a depurar si falla de nuevo
        res.status(500).json({ 
            error: 'Error al procesar la solicitud de recontacto.', 
            details: error.message 
        });
    } 
    // NOTA: Si usas 'pool.connect()', necesitas un bloque 'finally' para 'client.release()'. 
    // Si usas el cliente único, como en el código completo, este bloque final no es necesario.
});

// API 5: Obtener historial de un negocio
app.get('/api/negocios/historial/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            SELECT fecha_interaccion, medio, notas 
            FROM historial_interacciones -- <<-- CORREGIDO A TU NOMBRE DE TABLA
            WHERE negocio_id = $1 
            ORDER BY fecha_interaccion DESC;
        `;
        const result = await client.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(200).json({ historial: [], message: 'No hay historial para este negocio.' });
        }

        res.status(200).json({ historial: result.rows });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener historial' });
    }
});

// ==============================================
// INICIO DEL SERVIDOR
// ==============================================
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});