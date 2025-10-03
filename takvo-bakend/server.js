// server.js - VERSIÓN COMPLETAMENTE CORREGIDA (SIN POBLACION)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import cors from 'cors';

// --- Configuración de Paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticFilesPath = path.join(__dirname, '..', 'public');

const PORT = process.env.PORT || 3000;
const app = express();

// --- Middleware CRÍTICO ---
app.use(cors());
app.use(express.json());

// --- Configuración de la Base de Datos ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// --- Utilidad para Claves Foráneas ---
function formatForeignKeyId(idValue) {
    if (typeof idValue === 'string' && idValue.trim() !== '') {
        return idValue.trim().toLowerCase();
    }
    return null;
}

// *********************************************************************************
// API 1: CARGAR TODOS LOS DATOS - CORREGIDA (SIN POBLACION)
// *********************************************************************************

app.get('/api/datos', async (req, res) => {
    console.log('📥 Solicitando datos iniciales...');
    try {
        // Consulta 1: Negocios
        const negociosQuery = `
            SELECT 
                id, nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id, 
                recontacto_contador, ultima_fecha_contacto 
            FROM negocios ORDER BY id DESC;
        `;
        const { rows: negocios } = await pool.query(negociosQuery);
        console.log(`✅ Negocios cargados: ${negocios.length}`);

        // Consultas SEPARADAS para datos geográficos (más confiable)
        const paisesResult = await pool.query('SELECT id, nombre FROM paises;');
        const provinciasResult = await pool.query('SELECT id, nombre, pais_id FROM provincias;'); // SIN POBLACION
        const ciudadesResult = await pool.query('SELECT id, nombre, provincia_id FROM ciudades;');
        const rubrosResult = await pool.query('SELECT id, nombre FROM rubros ORDER BY nombre ASC;');

        const paisesData = paisesResult.rows;
        const provinciasData = provinciasResult.rows;
        const ciudadesData = ciudadesResult.rows;
        const rubrosData = rubrosResult.rows;

        console.log(`✅ Países: ${paisesData.length}, Provincias: ${provinciasData.length}, Ciudades: ${ciudadesData.length}, Rubros: ${rubrosData.length}`);

        // Estructurar datos geográficos
        const paisesEstructurados = paisesData.map(pais => {
            const provinciasDelPais = provinciasData
                .filter(provincia => provincia.pais_id === pais.id)
                .map(provincia => {
                    const ciudadesDeProvincia = ciudadesData
                        .filter(ciudad => ciudad.provincia_id === provincia.id);
                    return {
                        ...provincia,
                        ciudades: ciudadesDeProvincia
                    };
                });
            return {
                ...pais,
                provincias: provinciasDelPais
            };
        });

        res.json({
            negocios,
            paises: paisesEstructurados,
            rubros: rubrosData
        });

    } catch (error) {
        console.error('❌ Error al obtener datos iniciales:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor al cargar datos.',
            details: error.message 
        });
    }
});

// *********************************************************************************
// API 2: GUARDAR/ACTUALIZAR NEGOCIO - CORREGIDA
// *********************************************************************************

app.post('/api/negocios', async (req, res) => {
    console.log('📥 Creando nuevo negocio:', req.body);
    const { 
        nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id 
    } = req.body;
    
    try {
        // Validar campos requeridos
        if (!nombre || !telefono) {
            return res.status(400).json({ 
                error: 'Nombre y teléfono son campos requeridos' 
            });
        }

        // Formatear IDs
        const formattedRubroId = formatForeignKeyId(rubro_id);
        const formattedPaisId = formatForeignKeyId(pais_id);
        const formattedProvinciaId = formatForeignKeyId(provincia_id);
        const formattedCiudadId = formatForeignKeyId(ciudad_id);

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
            enviado || false,
            formattedPaisId,
            formattedProvinciaId,
            formattedCiudadId
        ];

        console.log('🚀 Ejecutando query con valores:', values);

        const result = await pool.query(query, values);
        console.log('✅ Negocio creado con ID:', result.rows[0].id);
        
        res.status(201).json({ 
            message: 'Negocio creado con éxito', 
            id: result.rows[0].id 
        });
    } catch (error) {
        console.error('❌ Error al crear el negocio:', error);
        res.status(500).json({ 
            error: 'Error al crear el negocio',
            details: error.message 
        });
    }
});

app.put('/api/negocios', async (req, res) => {
    console.log('📥 Actualizando negocio:', req.body);
    const { 
        id, nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id 
    } = req.body;
    
    try {
        if (!id) {
            return res.status(400).json({ error: 'ID del negocio es requerido' });
        }

        const formattedRubroId = formatForeignKeyId(rubro_id);
        const formattedPaisId = formatForeignKeyId(pais_id);
        const formattedProvinciaId = formatForeignKeyId(provincia_id);
        const formattedCiudadId = formatForeignKeyId(ciudad_id);

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

        const result = await pool.query(query, values);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Negocio no encontrado' });
        }

        console.log('✅ Negocio actualizado:', id);
        res.json({ message: 'Negocio actualizado con éxito' });
    } catch (error) {
        console.error('❌ Error al actualizar el negocio:', error);
        res.status(500).json({ 
            error: 'Error al actualizar el negocio',
            details: error.message 
        });
    }
});

// *********************************************************************************
// API 3: ELIMINAR NEGOCIO - CORREGIDA
// *********************************************************************************

app.delete('/api/negocios/:id', async (req, res) => {
    const { id } = req.params;
    console.log('🗑️ Eliminando negocio ID:', id);
    
    try {
        const query = 'DELETE FROM negocios WHERE id = $1;';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Negocio no encontrado' });
        }

        console.log('✅ Negocio eliminado:', id);
        res.json({ message: 'Negocio y su historial eliminados con éxito' });
    } catch (error) {
        console.error('❌ Error al eliminar el negocio:', error);
        res.status(500).json({ 
            error: 'Error al eliminar el negocio',
            details: error.message 
        });
    }
});

// *********************************************************************************
// API 4: REGISTRAR CONTACTO - CORREGIDA (USANDO negocios_id)
// *********************************************************************************

app.post('/api/negocios/registrar-contacto', async (req, res) => {
    const { id, medio, notas } = req.body;
    console.log('📞 Registrando contacto para negocio:', id);
    
    try {
        await pool.query('BEGIN');

        const insertHistorialQuery = `
            INSERT INTO historial_interacciones (negocios_id, fecha_interaccion, medio, notas)
            VALUES ($1, NOW(), $2, $3);
        `;
        await pool.query(insertHistorialQuery, [id, medio, notas]);

        const updateNegocioQuery = `
            UPDATE negocios
            SET recontacto_contador = COALESCE(recontacto_contador, 0) + 1,
                ultima_fecha_contacto = NOW()
            WHERE id = $1;
        `;
        await pool.query(updateNegocioQuery, [id]);

        await pool.query('COMMIT');
        console.log('✅ Contacto registrado para negocio:', id);
        res.status(200).json({ message: 'Recontacto registrado y negocio actualizado con éxito' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ Error al registrar el contacto:', error);
        res.status(500).json({ 
            error: 'Error en la transacción de contacto',
            details: error.message 
        });
    }
});

// *********************************************************************************
// API 5: OBTENER HISTORIAL - CORREGIDA (USANDO negocios_id)
// *********************************************************************************

app.get('/api/negocios/historial/:id', async (req, res) => {
    const { id } = req.params;
    console.log('📋 Solicitando historial para negocio:', id);
    
    try {
        const query = `
            SELECT fecha_interaccion, medio, notas 
            FROM historial_interacciones 
            WHERE negocios_id = $1 
            ORDER BY fecha_interaccion DESC;
        `;
        const { rows: historial } = await pool.query(query, [id]);
        
        console.log(`📊 Historial encontrado: ${historial.length} registros`);
        
        if (historial.length === 0) {
            return res.status(200).json({ historial: [] });
        }

        res.json({ historial });
    } catch (error) {
        console.error('❌ Error al obtener el historial:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor al obtener historial.',
            details: error.message 
        });
    }
});

// *********************************************************************************
// CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS
// *********************************************************************************

app.use(express.static(staticFilesPath));

app.use((req, res) => { 
    const indexPath = path.join(staticFilesPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('❌ Error al enviar index.html:', err);
            res.status(500).send('Error al cargar la aplicación web.');
        }
    });
});

// --- Inicio del Servidor ---
app.listen(PORT, () => {
    console.log(`✅ Servidor Express iniciado y escuchando en el puerto ${PORT}`);
    console.log(`📁 Sirviendo archivos estáticos desde: ${staticFilesPath}`);
    console.log(`🌐 Backend URL: https://basededatostakvo.onrender.com`);
});