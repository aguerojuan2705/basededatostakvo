// Variables globales para los datos y el estado de ordenamiento
let negocios = [];
const datos = {
    paises: []
};
let currentSort = { column: '', direction: 'asc' };

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos desde el servidor
    fetch('http://localhost:3000/api/datos')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
        })
        .then(serverData => {
            negocios = serverData.negocios;
            datos.paises = serverData.paises;
            inicializarSelectores();
            cargarTablaNegocios(negocios);
        })
        .catch(error => {
            console.error('Error al cargar datos desde el servidor:', error);
            // Si falla, podrías mostrar un mensaje de error o usar datos de respaldo
            alert('No se pudo conectar con el servidor. Se cargará una vista vacía.');
        });

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

    // Configurar modal
    document.getElementById('btn-add-business').addEventListener('click', abrirModal);
    document.querySelector('.close').addEventListener('click', cerrarModal);
    document.getElementById('business-form').addEventListener('submit', guardarNegocio);

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('business-modal')) {
            cerrarModal();
        }
    });

    // Event listeners para los selectores del modal
    document.getElementById('modal-provincia').addEventListener('change', function() {
        cargarCiudadesModal(this.value);
    });
});

// Funciones de inicialización
function inicializarSelectores() {
    const selectPais = document.getElementById('pais');
    const selectModalPais = document.getElementById('modal-pais');

    // Limpiar selectores antes de cargar
    selectPais.innerHTML = '<option value="">Seleccionar país</option>';
    selectModalPais.innerHTML = '<option value="">Seleccionar país</option>';

    datos.paises.forEach(pais => {
        selectPais.innerHTML += `<option value="${pais.id}">${pais.nombre}</option>`;
        selectModalPais.innerHTML += `<option value="${pais.id}">${pais.nombre}</option>`;
    });

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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay negocios registrados</td></tr>';
        return;
    }

    listaNegocios.forEach(negocio => {
        const pais = datos.paises.find(p => p.id === negocio.pais);
        let provincia = null;
        let ciudad = null;

        if (pais) {
            provincia = pais.provincias.find(p => p.id === negocio.provincia);
            if (provincia) {
                ciudad = provincia.ciudades.find(c => c.id === negocio.ciudad);
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${negocio.nombre}</td>
            <td>
                <a href="https://wa.me/${negocio.telefono.replace(/[\s-]/g, '')}" class="no-link-style" target="_blank" rel="noopener noreferrer">
                    ${negocio.telefono}
                </a>
            </td>
            <td>${capitalizeFirstLetter(negocio.rubro)}</td>
            <td>${ciudad ? ciudad.nombre : 'N/A'}</td>
            <td>${provincia ? provincia.nombre : 'N/A'}</td>
            <td class="status-cell">
                <button class="status-btn" data-id="${negocio.id}">
                    <i class="fas fa-check" style="color: ${negocio.enviado ? 'green' : '#ccc'};"></i>
                </button>
            </td>
            <td class="actions">
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

    actualizarEstadisticas();
}


function toggleStatus(id) {
    const negocio = negocios.find(n => n.id == id);
    if (negocio) {
        negocio.enviado = !negocio.enviado;

        fetch('http://localhost:3000/api/negocios', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(negocios)
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            cargarTablaNegocios(negocios);
        })
        .catch(error => console.error('Error al actualizar el estado:', error));
    }
}


function filtrarNegocios() {
    const pais = document.getElementById('pais').value;
    const provincia = document.getElementById('provincia').value;
    const ciudad = document.getElementById('ciudad').value;
    const rubro = document.getElementById('rubro').value;
    const busqueda = document.getElementById('busqueda').value.toLowerCase();

    const negociosFiltrados = negocios.filter(n => {
        const matchPais = pais ? n.pais === pais : true;
        const matchProvincia = provincia ? n.provincia === provincia : true;
        const matchCiudad = ciudad ? n.ciudad === ciudad : true;
        const matchRubro = rubro ? n.rubro === rubro : true;
        const matchBusqueda = n.nombre.toLowerCase().includes(busqueda);
        
        return matchPais && matchProvincia && matchCiudad && matchRubro && matchBusqueda;
    });

    cargarTablaNegocios(negociosFiltrados);
}


function ordenarTabla(column) {
    const tbody = document.querySelector('#tabla-negocios tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    let direction = 'asc';
    if (currentSort.column === column) {
        direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    }

    const sortedRows = rows.sort((a, b) => {
        const aValue = a.querySelector(`td:nth-child(${getColumnIndex(column)})`).textContent;
        const bValue = b.querySelector(`td:nth-child(${getColumnIndex(column)})`).textContent;

        if (direction === 'asc') {
            return aValue.localeCompare(bValue);
        } else {
            return bValue.localeCompare(aValue);
        }
    });

    tbody.innerHTML = '';
    sortedRows.forEach(row => tbody.appendChild(row));

    currentSort = { column, direction };
}


function getColumnIndex(column) {
    const headers = {
        'nombre': 1,
        'telefono': 2,
        'rubro': 3,
        'ciudad': 4,
        'provincia': 5
    };
    return headers[column] || 1;
}

// Funciones para el modal
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
    document.getElementById('modal-rubro').value = negocio.rubro;
    document.getElementById('modal-pais').value = negocio.pais;

    // Aseguramos que los selectores se carguen en el orden correcto
    cargarProvinciasModal(negocio.pais);
    // Usamos setTimeout para que la ciudad se cargue después de la provincia
    setTimeout(() => {
        document.getElementById('modal-provincia').value = negocio.provincia;
        cargarCiudadesModal(negocio.provincia);
        setTimeout(() => {
            document.getElementById('modal-ciudad').value = negocio.ciudad;
        }, 100); // Pequeño retraso para asegurar que la ciudad se cargue
    }, 100);

    document.getElementById('business-modal').style.display = 'flex';
}


function guardarNegocio(e) {
    e.preventDefault();

    const id = document.getElementById('business-id').value;
    const pais = document.getElementById('modal-pais').value;
    const provincia = document.getElementById('modal-provincia').value;
    const ciudad = document.getElementById('modal-ciudad').value;
    const rubro = document.getElementById('modal-rubro').value;
    const nombre = document.getElementById('modal-nombre').value;
    const telefono = document.getElementById('modal-telefono').value;

    if (id) {
        const index = negocios.findIndex(n => n.id == id);
        if (index !== -1) {
            negocios[index] = {
                id: parseInt(id),
                pais,
                provincia,
                ciudad,
                rubro,
                nombre,
                telefono,
                enviado: negocios[index].enviado
            };
        }
    } else {
        const newId = negocios.length > 0 ? Math.max(...negocios.map(n => n.id)) + 1 : 1;
        negocios.push({
            id: newId,
            pais,
            provincia,
            ciudad,
            rubro,
            nombre,
            telefono,
            enviado: false
        });
    }
    
    fetch('http://localhost:3000/api/negocios', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(negocios)
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        cargarTablaNegocios(negocios);
        cerrarModal();
    })
    .catch(error => {
        console.error('Error al guardar el negocio:', error);
        alert('Hubo un error al guardar el negocio. Inténtalo de nuevo.');
    });
}


function eliminarNegocio(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este negocio?')) {
        negocios = negocios.filter(n => n.id != id);

        fetch('http://localhost:3000/api/negocios', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(negocios)
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            cargarTablaNegocios(negocios);
        })
        .catch(error => console.error('Error al eliminar el negocio:', error));
    }
}


// Utilidades
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function actualizarEstadisticas() {
    const paisesUnicos = new Set(negocios.map(n => n.pais));
    document.getElementById('total-paises').textContent = paisesUnicos.size;

    const provinciasUnicas = new Set(negocios.map(n => n.provincia));
    document.getElementById('total-provincias').textContent = provinciasUnicas.size;

    const ciudadesUnicas = new Set(negocios.map(n => n.ciudad));
    document.getElementById('total-ciudades').textContent = ciudadesUnicas.size;

    document.getElementById('total-negocios').textContent = negocios.length;
}