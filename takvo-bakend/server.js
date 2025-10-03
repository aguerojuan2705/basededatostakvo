// server.js
// Servidor Express configurado para:
// 1. Servir archivos estáticos desde la carpeta 'public'.
// 2. Manejar todas las APIs del CRM.
// 3. Incluir las correcciones para el manejo de claves foráneas (NULL y minúsculas).

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg'; // Usamos pg para interactuar con PostgreSQL (Supabase)

// --- Configuración de Paths para Entornos Modernos (ES Modules) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();

// --- Configuración de la Base de Datos ---
// Asegúrate de que la variable de entorno DATABASE_URL esté configurada en Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, 
    ssl: {
        rejectUnauthorized: false // Necesario para conexiones SSL con Render/Supabase
    }
});

// Middleware
app.use(express.json()); // Habilita Express para parsear JSON en el body de las peticiones

// --- UTILIDAD CRÍTICA PARA CLAVES FORÁNEAS (SOLUCIONA EL ERROR FK) ---
// Asegura que los IDs de claves foráneas sean minúsculas o NULL si están vacíos.
function formatForeignKeyId(idValue) {
    if (typeof idValue === 'string' && idValue.trim() !== '') {
        // Devuelve el ID en minúsculas para coincidir con la DB (ej. 'argentina')
        return idValue.trim().toLowerCase();
    }
    // Si es nulo, indefinido, o una cadena vacía, devuelve NULL para la DB
    return null; 
}


// *********************************************************************************
// API 1: CARGAR TODOS LOS DATOS (NEGOCIOS, PAISES/PROVINCIAS/CIUDADES, RUBROS)
// *********************************************************************************

app.get('/api/datos', async (req, res) => {
    try {
        // Consulta 1: Negocios
        const negociosQuery = `
            SELECT 
                id, nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id, 
                recontacto_contador, ultima_fecha_contacto 
            FROM negocios ORDER BY id DESC;
        `;
        const { rows: negocios } = await pool.query(negociosQuery);

        // Consulta 2 y 3: Estructura geográfica y Rubros
        // Nota: Mantenemos la lógica de estructuración de países/provincias/ciudades aquí
        // para asegurar que el frontend solo reciba un JSON listo para usar.
        const paisesQuery = `
            SELECT id, nombre FROM paises;
            SELECT p.id, p.nombre, p.pais_id, p.poblacion FROM provincias p;
            SELECT c.id, c.nombre, c.provincia_id FROM ciudades c;
        `;
        const results = await pool.query(paisesQuery);
        
        const paisesData = results[0].rows;
        const provinciasData = results[1].rows;
        const ciudadesData = results[2].rows;

        // Estructurar los datos geográficos jerárquicamente (Ciudades anidadas en Provincias, Provincias anidadas en Países)
        const estructurados = paisesData.map(pais => {
            pais.provincias = provinciasData
                .filter(p => p.pais_id === pais.id)
                .map(provincia => {
                    provincia.ciudades = ciudadesData.filter(c => c.provincia_id === provincia.id);
                    return provincia;
                });
            return pais;
        });

        // Consulta 4: Rubros
        const rubrosQuery = 'SELECT id, nombre FROM rubros ORDER BY nombre ASC;';
        const { rows: rubros } = await pool.query(rubrosQuery);
        
        res.json({
            negocios,
            paises: estructurados,
            rubros
        });

    } catch (error) {
        console.error('Error al obtener datos iniciales:', error);
        res.status(500).json({ error: 'Error interno del servidor al cargar datos.' });
    }
});


// *********************************************************************************
// API 2: GUARDAR/ACTUALIZAR NEGOCIO (POST/PUT)
// *********************************************************************************

app.post('/api/negocios', async (req, res) => {
    const { 
        nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id 
    } = req.body;
    
    // Aplicar la utilidad de formato a los IDs de clave foránea
    const formattedRubroId = formatForeignKeyId(rubro_id);
    const formattedPaisId = formatForeignKeyId(pais_id);
    const formattedProvinciaId = formatForeignKeyId(provincia_id);
    const formattedCiudadId = formatForeignKeyId(ciudad_id);

    try {
        const query = `
            INSERT INTO negocios(
                nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id
            )
            VALUES($1, $2, $3, $4, $5, $6, $7) 
            RETURNING id;
        `;
        const values = [
            nombre,
            telefono,
            formattedRubroId,
            enviado,
            formattedPaisId,
            formattedProvinciaId,
            formattedCiudadId
        ];

        const result = await pool.query(query, values);
        res.status(201).json({ 
            message: 'Negocio creado con éxito', 
            id: result.rows[0].id 
        });
    } catch (error) {
        console.error('Error al crear el negocio:', error);
        res.status(500).json({ error: `Error al crear el negocio: ${error.message}` });
    }
});


app.put('/api/negocios', async (req, res) => {
    const { 
        id, nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id 
    } = req.body;
    
    // Aplicar la utilidad de formato a los IDs de clave foránea
    const formattedRubroId = formatForeignKeyId(rubro_id);
    const formattedPaisId = formatForeignKeyId(pais_id);
    const formattedProvinciaId = formatForeignKeyId(provincia_id);
    const formattedCiudadId = formatForeignKeyId(ciudad_id);

    try {
        const query = `
            UPDATE negocios SET
                nombre = $1,
                telefono = $2,
                rubro_id = $3,
                enviado = $4,
                pais_id = $5,
                provincia_id = $6,
                ciudad_id = $7
            WHERE id = $8;
        `;
        const values = [
            nombre,
            telefono,
            formattedRubroId,
            enviado,
            formattedPaisId,
            formattedProvinciaId,
            formattedCiudadId,
            id
        ];

        await pool.query(query, values);
        res.json({ message: 'Negocio actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar el negocio:', error);
        res.status(500).json({ error: `Error al actualizar el negocio: ${error.message}` });
    }
});


// *********************************************************************************
// API 3: ELIMINAR NEGOCIO (DELETE)
// *********************************************************************************

app.delete('/api/negocios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Nota: ON DELETE CASCADE en el historial eliminará las interacciones
        const query = 'DELETE FROM negocios WHERE id = $1;';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Negocio no encontrado' });
        }

        res.json({ message: 'Negocio y su historial eliminados con éxito' });
    } catch (error) {
        console.error('Error al eliminar el negocio:', error);
        res.status(500).json({ error: `Error al eliminar el negocio: ${error.message}` });
    }
});


// *********************************************************************************
// API 4: REGISTRAR CONTACTO Y ACTUALIZAR CONTADOR
// *********************************************************************************

app.post('/api/negocios/registrar-contacto', async (req, res) => {
    const { id, medio, notas } = req.body; // id es el ID del negocio
    try {
        await pool.query('BEGIN'); // Inicia una transacción

        // 1. Insertar la nueva interacción en el historial
        const insertHistorialQuery = `
            INSERT INTO historial_interacciones (negocio_id, fecha_interaccion, medio, notas)
            VALUES ($1, NOW(), $2, $3);
        `;
        await pool.query(insertHistorialQuery, [id, medio, notas]);

        // 2. Actualizar el contador y la fecha del negocio
        const updateNegocioQuery = `
            UPDATE negocios
            SET recontacto_contador = COALESCE(recontacto_contador, 0) + 1,
                ultima_fecha_contacto = NOW()
            WHERE id = $1;
        `;
        await pool.query(updateNegocioQuery, [id]);

        await pool.query('COMMIT'); // Confirma la transacción
        res.status(200).json({ message: 'Recontacto registrado y negocio actualizado con éxito' });
    } catch (error) {
        await pool.query('ROLLBACK'); // En caso de error, revierte
        console.error('Error al registrar el contacto:', error);
        res.status(500).json({ error: `Error en la transacción de contacto: ${error.message}` });
    }
});

// *********************************************************************************
// API 5: OBTENER HISTORIAL DE INTERACCIONES
// *********************************************************************************

app.get('/api/negocios/historial/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT fecha_interaccion, medio, notas 
            FROM historial_interacciones 
            WHERE negocio_id = $1 
            ORDER BY fecha_interaccion DESC;
        `;
        const { rows: historial } = await pool.query(query, [id]);
        
        if (historial.length === 0) {
            // Devuelve 204 No Content si no hay historial para que el frontend lo maneje
            return res.status(204).json({ message: 'No hay historial para este negocio.' });
        }

        res.json({ historial });
    } catch (error) {
        console.error('Error al obtener el historial:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener historial.' });
    }
});


// *********************************************************************************
// CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS Y RUTA PRINCIPAL
// *********************************************************************************

// Define la ruta a la carpeta 'public' donde se encuentra el index.html, CSS y JS
const staticFilesPath = path.join(__dirname, 'public');

// Middleware para servir archivos estáticos (debe ir antes del catch-all)
app.use(express.static(staticFilesPath));

// Ruta Catch-All: Sirve el index.html para cualquier otra solicitud que no sea API.
app.get('*', (req, res) => {
    // Asegura que se envíe el index.html de la carpeta 'public'
    const indexPath = path.join(staticFilesPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Error al enviar index.html:', err);
            res.status(500).send('Error al cargar la aplicación web.');
        }
    });
});


// --- Inicio del Servidor ---
app.listen(PORT, () => {
    console.log(`✅ Servidor Express iniciado y escuchando en el puerto ${PORT}`);
});
