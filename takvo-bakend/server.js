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
    const { id, medio, notas } = req.body;
    const now = new Date();

    try {
        // 1. Registrar la interacción en la tabla de historial
        const historialQuery = `
            INSERT INTO historial_contacto (negocio_id, fecha_interaccion, medio, notas)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        await client.query(historialQuery, [id, now, medio, notas]);

        // 2. Actualizar el negocio principal
        const updateNegocioQuery = `
            UPDATE negocios
            SET recontacto_contador = recontacto_contador + 1, 
                ultima_fecha_contacto = $1
            WHERE id = $2
            RETURNING *;
        `;
        const result = await client.query(updateNegocioQuery, [now, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Negocio no encontrado.' });
        }

        res.status(200).json({ 
            message: 'Recontacto registrado con éxito', 
            historial: result.rows[0]
        });

    } catch (error) {
        console.error('Error al registrar recontacto:', error);
        res.status(500).json({ error: 'Error interno del servidor al registrar contacto' });
    }
});


// API 5: Obtener historial de un negocio
app.get('/api/negocios/historial/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            SELECT fecha_interaccion, medio, notas 
            FROM historial_contacto 
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