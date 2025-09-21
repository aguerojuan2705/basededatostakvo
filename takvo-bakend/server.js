const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Habilita CORS para permitir peticiones desde tu frontend
app.use(express.json()); // Habilita el análisis del cuerpo de las peticiones en formato JSON

// Ruta al archivo JSON de datos
const dataFilePath = path.join(__dirname, 'negocios.json');

// Función para leer los datos del archivo JSON
function readData() {
    try {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error al leer el archivo de datos:', error);
        return { negocios: [], paises: [] }; // Devuelve un objeto vacío en caso de error
    }
}

// Función para escribir los datos en el archivo JSON
function writeData(data) {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

// ----------------------
// Definición de las API
// ----------------------

// API 1: Obtener todos los datos
app.get('/api/datos', (req, res) => {
    const data = readData();
    res.json(data);
});

// API 2: Actualizar la lista de negocios
app.put('/api/negocios', (req, res) => {
    const newData = req.body;
    const data = readData();
    data.negocios = newData; // Reemplaza la lista completa
    writeData(data);
    res.status(200).json({ message: 'Datos de negocios actualizados con éxito' });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});