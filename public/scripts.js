// Variables globales para los datos y el estado de ordenamiento
let negocios = [];
const datos = {
    paises: []
};
let currentSort = { column: '', direction: 'asc' };

// Define la URL base de tu backend de Render
const backendUrl = 'https://basededatostakvo.onrender.com';

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos desde el servidor
    fetchDataAndInitialize();

    // Configurar event listeners
    document.getElementById('modal-pais').addEventListener('change', function() {
        cargarProvinciasModal(this.value);
    });
    document.getElementById('pais').addEventListener('change', function() {
        cargarProvincias(this.value);
        filtrarNegocios();
    });
    document.getElementById('provincia').addEventListener('change', function() {
        cargarCiudades(this.value);
        filtrarNegocios();
    });
    document.getElementById('ciudad').addEventListener('change', filtrarNegocios);
    document.getElementById('rubro').addEventListener('change', filtrarNegocios);
    document.getElementById('busqueda').addEventListener('input', filtrarNegocios);

    // Configurar botones de ordenamiento
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            ordenarTabla(header.dataset.sort);
        });
    });

    // Configurar modal de Agregar/Editar Negocio
    document.getElementById('btn-add-business').addEventListener('click', abrirModal);
    document.querySelector('.close').addEventListener('click', cerrarModal);
    document.getElementById('business-form').addEventListener('submit', guardarNegocio);
    document.getElementById('modal-provincia').addEventListener('change', function() {
        cargarCiudadesModal(this.value);
    });

    // Configurar modal de Contacto/Historial
    document.getElementById('contact-modal-close').addEventListener('click', () => {
        document.getElementById('contact-modal').style.display = 'none';
    });
    document.getElementById('register-contact-form').addEventListener('submit', guardarNuevoContacto);


    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('business-modal')) {
            cerrarModal();
        }
        if (e.target === document.getElementById('contact-modal')) {
            document.getElementById('contact-modal').style.display = 'none';
        }
    });

});

async function fetchDataAndInitialize() {
    try {
        const response = await fetch(`${backendUrl}/api/datos`);
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }
        const serverData = await response.json();
        negocios = serverData.negocios;
        datos.paises = serverData.paises;
        datos.rubros = serverData.rubros; // Asegurarse de tener los rubros si se usan en los selectores
        inicializarSelectores();
        cargarTablaNegocios(negocios);
    } catch (error) {
        console.error('Error al cargar datos desde el servidor:', error);
        alert('No se pudo conectar con el servidor o la base de datos. Se cargará una vista vacía.');
    }
}

// Funciones de inicialización
function inicializarSelectores() {
    const selectPais = document.getElementById('pais');
    const selectModalPais = document.getElementById('modal-pais');
    const selectRubro = document.getElementById('rubro');
    const selectModalRubro = document.getElementById('modal-rubro');

    // Limpiar selectores antes de cargar
    selectPais.innerHTML = '<option value="">Seleccionar país</option>';
    selectModalPais.innerHTML = '<option value="">Seleccionar país</option>';
    selectRubro.innerHTML = '<option value="">Seleccionar rubro</option>';
    selectModalRubro.innerHTML = '<option value="">Seleccionar rubro</option>';

    datos.paises.forEach(pais => {
        selectPais.innerHTML += `<option value="${pais.id}">${pais.nombre}</option>`;
        selectModalPais.innerHTML += `<option value="${pais.id}">${pais.nombre}</option>`;
    });

    // Cargar rubros (asumiendo que vienen en datos.rubros)
    if (datos.rubros) {
        datos.rubros.forEach(rubro => {
            selectRubro.innerHTML += `<option value="${rubro.id}">${rubro.nombre}</option>`;
            selectModalRubro.innerHTML += `<option value="${rubro.id}">${rubro.nombre}</option>`;
        });
    }

    // Cargar Argentina por defecto en ambos selectores
    document.getElementById('pais').value = 'argentina';
    document.getElementById('modal-pais').value = 'argentina';
    
    // Cargar provincias y ciudades iniciales para Argentina
    cargarProvincias('argentina');
    cargarCiudades('');
}

function cargarProvincias(paisId) {
    const selectProvincia = document.getElementById('provincia');
    selectProvincia.innerHTML = '<option value="">Seleccionar provincia</option>';

    const pais = datos.paises.find(p => p.id === paisId);
    if (pais) {
        // Ordenar provincias por población (descendente)
        const provinciasOrdenadas = [...pais.provincias].sort((a, b) => b.poblacion - a.poblacion);

        provinciasOrdenadas.forEach(provincia => {
            selectProvincia.innerHTML += `<option value="${provincia.id}">${provincia.nombre}</option>`;
        });
    }

    // Resetear selector de ciudades
    document.getElementById('ciudad').innerHTML = '<option value="">Seleccionar ciudad</option>';
}

function cargarCiudades(provinciaId) {
    const selectCiudad = document.getElementById('ciudad');
    selectCiudad.innerHTML = '<option value="">Seleccionar ciudad</option>';

    if (!provinciaId) {
        return;
    }

    // Usar el valor del selector de país principal
    const paisId = document.getElementById('pais').value;
    const paisSeleccionado = datos.paises.find(p => p.id === paisId); 

    if (paisSeleccionado) {
        const provincia = paisSeleccionado.provincias.find(p => p.id === provinciaId);
        if (provincia) {
            provincia.ciudades.forEach(ciudad => {
                selectCiudad.innerHTML += `<option value="${ciudad.id}">${ciudad.nombre}</option>`;
            });
        }
    }
}

// Funciones para cargar las provincias en el modal
function cargarProvinciasModal(paisId) {
    const selectProvinciaModal = document.getElementById('modal-provincia');
    selectProvinciaModal.innerHTML = '<option value="">Seleccionar provincia</option>';
    
    if (!paisId) {
        return;
    }

    const pais = datos.paises.find(p => p.id === paisId);
    if (pais) {
        pais.provincias.forEach(provincia => {
            selectProvinciaModal.innerHTML += `<option value="${provincia.id}">${provincia.nombre}</option>`;
        });
    }

    document.getElementById('modal-ciudad').innerHTML = '<option value="">Seleccionar ciudad</option>';
}

// Funciones para cargar las ciudades en el modal
function cargarCiudadesModal(provinciaId) {
    const selectCiudadModal = document.getElementById('modal-ciudad');
    selectCiudadModal.innerHTML = '<option value="">Seleccionar ciudad</option>';

    if (!provinciaId) {
        return;
    }
    
    const paisId = document.getElementById('modal-pais').value; 
    const paisSeleccionado = datos.paises.find(p => p.id === paisId);

    if (paisSeleccionado) {
        const provincia = paisSeleccionado.provincias.find(p => p.id === provinciaId);
        if (provincia) {
            provincia.ciudades.forEach(ciudad => {
                selectCiudadModal.innerHTML += `<option value="${ciudad.id}">${ciudad.nombre}</option>`;
            });
        }
    }
}

// Funciones para la tabla
function cargarTablaNegocios(listaNegocios) {
    const tbody = document.querySelector('#tabla-negocios tbody');
    tbody.innerHTML = '';

    if (listaNegocios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No hay negocios registrados</td></tr>';
        return;
    }

    listaNegocios.forEach(negocio => {
        const pais = datos.paises.find(p => p.id === negocio.pais_id);
        let provincia = null;
        let ciudad = null;

        if (pais) {
            provincia = pais.provincias.find(p => p.id === negocio.provincia_id);
            if (provincia) {
                ciudad = provincia.ciudades.find(c => c.id === negocio.ciudad_id);
            }
        }

        // Formato para la fecha
        const ultimaFecha = negocio.ultima_fecha_contacto 
            ? new Date(negocio.ultima_fecha_contacto).toLocaleDateString('es-AR')
            : 'Nunca';

        const tr = document.createElement('tr');
        // NOTA: EL ORDEN DE LAS COLUMNAS AQUÍ DEBE COINCIDIR CON EL <thead> EN TU HTML (9 columnas)
        tr.innerHTML = `
            <td>${negocio.nombre}</td>
            <td>
                <a href="https://wa.me/${negocio.telefono.replace(/[\s-]/g, '')}" class="no-link-style" target="_blank" rel="noopener noreferrer">
                    ${negocio.telefono}
                </a>
            </td>
            <td>${capitalizeFirstLetter(negocio.rubro_id)}</td>
            <td>${ciudad ? ciudad.nombre : 'N/A'}</td>
            <td>${provincia ? provincia.nombre : 'N/A'}</td>
            <td>${pais ? pais.nombre : 'N/A'}</td> 
            
            <td>${negocio.recontacto_contador || 0}</td> 
            <td>${ultimaFecha}</td> 
                        <td class="status-cell">
                <button class="status-btn" data-id="${negocio.id}">
                    <i class="fas fa-check" style="color: ${negocio.enviado ? 'green' : '#ccc'};"></i>
                </button>
            </td>
            <td class="actions">
                <button class="action-btn contact-btn" data-id="${negocio.id}" title="Registrar Recontacto">
                    <i class="fas fa-phone-alt"></i> 
                </button>
                <button class="action-btn edit-btn" data-id="${negocio.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${negocio.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    // Agregar event listeners a los botones de acción
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            editarNegocio(btn.dataset.id);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            eliminarNegocio(btn.dataset.id);
        });
    });

    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleStatus(btn.dataset.id);
        });
    });
    
    // **ACTUALIZADO**: Listener para el nuevo Modal de Contacto
    document.querySelectorAll('.contact-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            abrirModalContacto(btn.dataset.id); // Llama a la nueva función
        });
    });

    actualizarEstadisticas();
}


async function toggleStatus(id) {
    const negocio = negocios.find(n => n.id == id);
    if (negocio) {
        negocio.enviado = !negocio.enviado;
        try {
            const response = await fetch(`${backendUrl}/api/negocios`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(negocio)
            });
            if (!response.ok) {
                throw new Error('Error al actualizar el estado');
            }
            await fetchDataAndInitialize(); // Recargar datos después de la actualización
        } catch (error) {
            console.error('Error al actualizar el estado:', error);
        }
    }
}


function filtrarNegocios() {
    const pais = document.getElementById('pais').value;
    const provincia = document.getElementById('provincia').value;
    const ciudad = document.getElementById('ciudad').value;
    const rubro = document.getElementById('rubro').value;
    const busqueda = document.getElementById('busqueda').value.toLowerCase();

    const negociosFiltrados = negocios.filter(n => {
        const matchPais = pais ? n.pais_id === pais : true;
        const matchProvincia = provincia ? n.provincia_id === provincia : true;
        const matchCiudad = ciudad ? n.ciudad_id === ciudad : true;
        const matchRubro = rubro ? n.rubro_id === rubro : true;
        const matchBusqueda = n.nombre.toLowerCase().includes(busqueda);
        
        return matchPais && matchProvincia && matchCiudad && matchRubro && matchBusqueda;
    });

    cargarTablaNegocios(negociosFiltrados);
}


function ordenarTabla(column) {
    const tbody = document.querySelector('#tabla-negocios tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // 1. Determinar dirección
    let direction = 'asc';
    if (currentSort.column === column) {
        direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    }

    // ... [Tu lógica de ordenamiento (rows.sort)] ...
    const sortedRows = rows.sort((a, b) => {
        const aValue = a.querySelector(`td:nth-child(${getColumnIndex(column)})`).textContent;
        const bValue = b.querySelector(`td:nth-child(${getColumnIndex(column)})`).textContent;

        if (direction === 'asc') {
            return aValue.localeCompare(bValue);
        } else {
            return bValue.localeCompare(aValue);
        }
    });
    // ...

    // 2. Limpiar clases de ordenamiento
    document.querySelectorAll('.sortable').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
    });

    // 3. Aplicar nueva clase al encabezado activo
    const activeHeader = document.querySelector(`[data-sort="${column}"]`);
    if (activeHeader) {
        activeHeader.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }

    // 4. Renderizar filas ordenadas
    tbody.innerHTML = '';
    sortedRows.forEach(row => tbody.appendChild(row));

    currentSort = { column, direction };
}


function getColumnIndex(column) {
    // 1: Nombre, 2: Teléfono, 3: Rubro, 4: Ciudad, 5: Provincia, 6: País, 7: Recontactos, 8: Último Contacto, 9: Enviado, 10: Acciones
    // Nota: Las columnas de la tabla son 10 ahora, pero los datos de ordenamiento son menos.
    const headers = {
        'nombre': 1,
        'telefono': 2,
        'rubro': 3,
        'ciudad': 4,
        'provincia': 5,
        'pais': 6,
        'recontactos': 7,
        'contacto': 8
    };
    return headers[column] || 1;
}

// Funciones para el modal de Negocios
function abrirModal() {
    document.getElementById('modal-title').textContent = 'Agregar Nuevo Negocio';
    document.getElementById('business-form').reset();
    document.getElementById('business-id').value = '';
    
    // Cargar Argentina por defecto
    document.getElementById('modal-pais').value = 'argentina';
    cargarProvinciasModal('argentina');

    document.getElementById('business-modal').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('business-modal').style.display = 'none';
}

function editarNegocio(id) {
    const negocio = negocios.find(n => n.id == id);
    if (!negocio) return;

    document.getElementById('modal-title').textContent = 'Editar Negocio';
    document.getElementById('business-id').value = negocio.id;
    document.getElementById('modal-nombre').value = negocio.nombre;
    document.getElementById('modal-telefono').value = negocio.telefono;
    document.getElementById('modal-rubro').value = negocio.rubro_id;
    document.getElementById('modal-pais').value = negocio.pais_id;

    // Aseguramos que los selectores se carguen en el orden correcto
    cargarProvinciasModal(negocio.pais_id);
    // Usamos setTimeout para que la ciudad se cargue después de la provincia
    setTimeout(() => {
        document.getElementById('modal-provincia').value = negocio.provincia_id;
        cargarCiudadesModal(negocio.provincia_id);
        setTimeout(() => {
            document.getElementById('modal-ciudad').value = negocio.ciudad_id;
        }, 100); // Pequeño retraso para asegurar que la ciudad se cargue
    }, 100);

    document.getElementById('business-modal').style.display = 'flex';
}


async function guardarNegocio(e) {
    e.preventDefault();

    const id = document.getElementById('business-id').value;
    const pais_id = document.getElementById('modal-pais').value;
    const provincia_id = document.getElementById('modal-provincia').value;
    const ciudad_id = document.getElementById('modal-ciudad').value;
    const rubro_id = document.getElementById('modal-rubro').value;
    const nombre = document.getElementById('modal-nombre').value;
    const telefono = document.getElementById('modal-telefono').value;

    const negocioData = {
        nombre,
        telefono,
        rubro_id,
        pais_id,
        provincia_id,
        ciudad_id
    };

    if (id) {
        // Si hay un ID, es una edición
        negocioData.id = parseInt(id);
        const negocioExistente = negocios.find(n => n.id == id);
        negocioData.enviado = negocioExistente ? negocioExistente.enviado : false;
    } else {
        // Si no hay ID, es un nuevo negocio
        negocioData.enviado = false;
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = `${backendUrl}/api/negocios`;

        const response = await fetch(url, {
            method: method, // Usar 'POST' o 'PUT' dinámicamente
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(negocioData)
        });
        
        if (!response.ok) {
            throw new Error('Error al guardar el negocio');
        }

        const data = await response.json();
        console.log(data.message);
        await fetchDataAndInitialize(); // Recargar datos del servidor
        cerrarModal();
    } catch (error) {
        console.error('Error al guardar el negocio:', error);
        alert('Hubo un error al guardar el negocio. Inténtalo de nuevo.');
    }
}


async function eliminarNegocio(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este negocio?')) {
        try {
            const response = await fetch(`${backendUrl}/api/negocios/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Error al eliminar el negocio');
            }

            const data = await response.json();
            console.log(data.message);
            await fetchDataAndInitialize(); // Recargar datos del servidor
        } catch (error) {
            console.error('Error al eliminar el negocio:', error);
            alert('Hubo un error al eliminar el negocio. Inténtalo de nuevo.');
        }
    }
}

// *****************************************************************
// Funciones de Soporte para el Modal de Contacto (Historial y Registro)
// *****************************************************************

async function fetchHistorial(contactoId) {
    try {
        const response = await fetch(`${backendUrl}/api/negocios/historial/${contactoId}`);
        if (!response.ok) {
            // Manejar 404/204 si la ruta no existe o no hay datos, pero no es un error fatal
            if (response.status === 404 || response.status === 204) {
                 return [];
            }
            throw new Error('Error al obtener el historial');
        }
        const data = await response.json();
        // Asumiendo que el backend devuelve { historial: [...] }
        return data.historial || [];
    } catch (error) {
        console.error('Error al cargar historial:', error);
        return [];
    }
}

async function abrirModalContacto(id) {
    const negocio = negocios.find(n => n.id == id);
    if (!negocio) return;

    // 1. Configurar datos básicos
    document.getElementById('contact-business-id').value = id;
    document.getElementById('contact-business-name').textContent = negocio.nombre;
    document.getElementById('register-contact-form').reset(); // Limpiar formulario

    // 2. Obtener y mostrar el historial
    const historyList = document.getElementById('contact-history-list');
    historyList.innerHTML = '<li>Cargando historial...</li>';
    
    const historial = await fetchHistorial(id); 

    historyList.innerHTML = '';
    if (historial.length === 0) {
        historyList.innerHTML = '<li>No hay interacciones registradas.</li>';
    } else {
        historial.forEach(item => {
            // Muestra la fecha y hora de la interacción
            const fecha = new Date(item.fecha_interaccion).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            historyList.innerHTML += `
                <li>
                    <strong>${fecha} (${item.medio}):</strong> ${item.notas}
                </li>`;
        });
    }

    // 3. Abrir modal
    document.getElementById('contact-modal').style.display = 'flex';
}

async function guardarNuevoContacto(e) {
    e.preventDefault();

    const id = document.getElementById('contact-business-id').value;
    const medio = document.getElementById('contact-medio').value;
    const notas = document.getElementById('contact-notas').value;

    if (!medio || !notas) {
        alert('Por favor, selecciona un medio e ingresa una nota.');
        return;
    }

    const negocioData = {
        id: parseInt(id),
        medio: medio,
        notas: notas
    };

    try {
        const url = `${backendUrl}/api/negocios/registrar-contacto`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(negocioData)
        });
        
        if (!response.ok) {
            const errorData = await response.json(); 
            throw new Error(`Error: ${errorData.error || response.statusText}`);
        }

        // Éxito:
        document.getElementById('contact-modal').style.display = 'none'; // Cerrar modal
        alert('¡Recontacto registrado con éxito!');
        await fetchDataAndInitialize(); // Recargar datos de la tabla principal
        
    } catch (error) {
        console.error('Error al registrar el recontacto:', error);
        alert(`Hubo un error. Detalle: ${error.message}`);
    }
}

// Utilidades
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function actualizarEstadisticas() {
    const paisesUnicos = new Set(negocios.map(n => n.pais_id));
    document.getElementById('total-paises').textContent = paisesUnicos.size;

    const provinciasUnicas = new Set(negocios.map(n => n.provincia_id));
    document.getElementById('total-provincias').textContent = provinciasUnicas.size;

    const ciudadesUnicas = new Set(negocios.map(n => n.ciudad_id));
    document.getElementById('total-ciudades').textContent = ciudadesUnicas.size;

    document.getElementById('total-negocios').textContent = negocios.length;
}