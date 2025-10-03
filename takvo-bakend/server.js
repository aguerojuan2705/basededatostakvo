// server.js
// Este servidor Express se configura para servir archivos estáticos 
// desde una carpeta 'public' y asegurar que todas las rutas 
// devuelvan el index.html para manejar el enrutamiento del lado del cliente (si aplica).

// Importaciones
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// --- 1. Configuración de Paths para Entornos Modernos (ES Modules) ---
// Estas líneas son necesarias para que __dirname funcione con 'import/export'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define el puerto, usa la variable de entorno PORT (típica en hosts como Render) o 3000 por defecto
const PORT = process.env.PORT || 3000;
const app = express();

// --- 2. Middleware y Configuración de Archivos Estáticos ---

// Define la ruta a la carpeta 'public' donde se encuentra el index.html, CSS y JS
const staticFilesPath = path.join(__dirname, 'public');

// Middleware para servir archivos estáticos
// Esto permite que Express sirva directamente todos los archivos dentro de la carpeta 'public'.
app.use(express.static(staticFilesPath));

// --- 3. Rutas de API (Ejemplo, si tienes) ---
// Si tuvieras rutas de API, irían aquí. 
// Por ejemplo:
// app.get('/api/data', (req, res) => {
//     res.json({ message: 'Datos de la API' });
// });

// --- 4. Ruta Catch-All (La más Importante para tu index.html) ---

// Esta ruta captura cualquier otra solicitud que no haya sido manejada por:
// a) Los archivos estáticos (es decir, el path no es un .css, .js, o /)
// b) Las rutas de la API (si las definiste)
app.get('*', (req, res) => {
    console.log(`Solicitud de ruta no encontrada: ${req.path}. Sirviendo index.html.`);
    
    // Envía el archivo index.html
    const indexPath = path.join(staticFilesPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            // Manejo de errores si el archivo no se puede leer (ej. no existe)
            console.error('Error al enviar index.html:', err);
            res.status(500).send('Error al cargar la aplicación web. Archivo index.html no encontrado.');
        }
    });
});


// --- 5. Inicio del Servidor ---
app.listen(PORT, () => {
    console.log(`✅ Servidor Express iniciado y escuchando en http://localhost:${PORT}`);
    console.log(`📁 Buscando archivos estáticos en: ${staticFilesPath}`);
});
