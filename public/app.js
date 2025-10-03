/**
 * Logica Principal de la Aplicacion (app.js)
 * * Contiene el código JavaScript que maneja la interactividad,
 * carga de datos y manipulacion del DOM.
 */

// URL base para un ejemplo de API. Puedes reemplazarla con tu propio backend.
const API_BASE_URL = '/api'; // Apunta al mismo servidor Express

/**
 * Espera a que el DOM esté completamente cargado antes de ejecutar la lógica principal.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente cargado. Inicializando la aplicación.');
    initializeApp();
});

/**
 * Funcion principal de inicializacion.
 * Aqui se configuran los eventos y se cargan los datos iniciales.
 */
function initializeApp() {
    // 1. Configurar eventos de botones
    setupEventListeners();

    // 2. Cargar datos al inicio (ejemplo)
    loadInitialData();
}

/**
 * Configura los "listeners" para los elementos interactivos del DOM.
 */
function setupEventListeners() {
    // Ejemplo de boton: Asumimos que tienes un boton con id="action-button" en tu index.html
    const actionButton = document.getElementById('action-button');

    if (actionButton) {
        actionButton.addEventListener('click', handleButtonClick);
    } else {
        console.warn('Advertencia: No se encontró el elemento con ID "action-button" en el DOM.');
    }

    // Puedes agregar más listeners aqui (ej. formularios, inputs, etc.)
}

/**
 * Manejador del evento click del boton de ejemplo.
 */
function handleButtonClick() {
    console.log('¡Botón de acción presionado!');
    
    // Cambiar el contenido de un elemento (ejemplo)
    const statusDisplay = document.getElementById('status-message');
    if (statusDisplay) {
        statusDisplay.textContent = '¡Acción ejecutada con éxito!';
        statusDisplay.classList.add('text-green-500'); // Asume que usas Tailwind CSS
    }

    // Aquí iría la lógica para enviar datos a la API, actualizar la UI, etc.
    // Ejemplo: sendDataToAPI({ action: 'clicked' });
}

/**
 * Carga datos iniciales (simulados o desde una API) y los muestra en la UI.
 */
async function loadInitialData() {
    const dataContainer = document.getElementById('data-list');
    
    if (!dataContainer) {
        console.warn('Advertencia: No se encontró el contenedor de datos con ID "data-list".');
        return;
    }
    
    try {
        dataContainer.innerHTML = '<li>Cargando datos...</li>';
        
        // --- Simulacion de llamada a API ---
        // Reemplaza esto con una llamada real a tu API, si la tienes.
        // const response = await fetch(`${API_BASE_URL}/items`);
        // const data = await response.json();
        
        // Datos simulados:
        await new Promise(resolve => setTimeout(resolve, 800)); // Simula un retraso de red
        const data = [
            { id: 1, name: 'Elemento de prueba 1' },
            { id: 2, name: 'Elemento de prueba 2' },
            { id: 3, name: 'Elemento de prueba 3' },
        ];
        // ------------------------------------

        if (data.length === 0) {
            dataContainer.innerHTML = '<li>No hay elementos disponibles.</li>';
            return;
        }

        // Crear elementos de lista basados en los datos
        const listItems = data.map(item => {
            const li = document.createElement('li');
            li.textContent = `ID ${item.id}: ${item.name}`;
            li.className = 'p-2 border-b border-gray-200 hover:bg-gray-50';
            return li.outerHTML; // Usamos outerHTML para una inserción más simple
        }).join('');

        dataContainer.innerHTML = listItems;

    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        dataContainer.innerHTML = '<li class="text-red-500">Error al cargar la información.</li>';
    }
}

// Puedes exportar funciones si usas módulos, pero para un script simple, 
// es más fácil dejarlas globales.
