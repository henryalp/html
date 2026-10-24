const api = window.rutas.api;
const parametros = new URLSearchParams(window.location.search);
const articuloId = parametros.get('id') || '';
const personaId = parametros.get('persona') || '';
const detalleArticulo = document.getElementById('product-detail');
const aviso = document.getElementById('product-message');
const panelChat = document.getElementById('chat-panel');
const formularioChat = document.getElementById('chat-form');
const entradaMensaje = document.getElementById('chat-text');
const listaMensajes = document.getElementById('chat-messages');
const botonAtras = document.getElementById('chat-back');
const mensajeVacio = document.getElementById('chat-empty');
const paginaProducto = document.querySelector('.cm-product-layout');

let csrfToken = '';
let usuario = null;
let articulo = null;
let persona = null;
let temporizador = null;

function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.hidden = false;
}

function agregarTexto(padre, etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    elemento.className = clase;
    elemento.textContent = texto;
    padre.appendChild(elemento);
    return elemento;
}

async function enviarPeticion(accion, datos) {
    datos.csrfToken = csrfToken;
    const respuesta = await fetch(api + '?action=' + accion, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) {
        throw new Error(resultado.message);
    }
    return resultado;
}

function mostrarMensajes(hilo) {
    const ids = hilo.messages.map(function (mensaje) {
        return mensaje.id;
    }).join(',');
    if (listaMensajes.dataset.ids === ids) {
        return;
    }

    listaMensajes.dataset.ids = ids;
    listaMensajes.replaceChildren();
    mensajeVacio.hidden = hilo.messages.length > 0;
    document.getElementById('chat-title').textContent = 'Mensajes con ' + hilo.personaNombre;

    hilo.messages.forEach(function (mensaje) {
        const esMio = mensaje.emisorId === usuario.id;
        const clase = esMio ? 'cm-chat-bubble cm-chat-mine' : 'cm-chat-bubble';
        const burbuja = agregarTexto(listaMensajes, 'div', clase, '');
        agregarTexto(burbuja, 'span', 'cm-chat-sender', esMio ? 'Tú' : mensaje.emisorNombre);
        agregarTexto(burbuja, 'p', '', mensaje.texto);
        agregarTexto(burbuja, 'small', '', new Date(mensaje.fecha).toLocaleString('es-DO', {
            dateStyle: 'short',
            timeStyle: 'short'
        }));
    });
    listaMensajes.scrollTop = listaMensajes.scrollHeight;
}

async function actualizarMensajes() {
    if (!persona || !articulo) {
        return;
    }
    try {
        const url = api + '?action=get-thread&listingId=' + encodeURIComponent(articulo.id)
            + '&persona=' + encodeURIComponent(persona.id);
        const respuesta = await fetch(url);
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(resultado.message);
        }
        mostrarMensajes(resultado.hilo);
    } catch (error) {
        mostrarAviso(error.message);
    }
}

function abrirMensajes(otraPersona) {
    persona = otraPersona;
    panelChat.hidden = false;
    paginaProducto.classList.add('cm-chat-open');
    document.getElementById('chat-title').textContent = 'Mensajes con ' + persona.name;
    const url = new URL(window.location.href);
    url.searchParams.set('persona', persona.id);
    window.history.replaceState(null, '', url);
    actualizarMensajes();
    if (temporizador === null) {
        temporizador = window.setInterval(actualizarMensajes, 2500);
    }
}

function cerrarMensajes() {
    panelChat.hidden = true;
    paginaProducto.classList.remove('cm-chat-open');
    persona = null;
    if (temporizador !== null) {
        window.clearInterval(temporizador);
        temporizador = null;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('persona');
    window.history.replaceState(null, '', url);
}

function iconoCategoria(categoria) {
    const iconos = {
        'Electrónica': '🎧',
        'Hogar': '🪑',
        'Moda': '👟',
        'Deportes': '⚽',
        'Vehículos': '🚲',
        'Coleccionables': '📷'
    };
    return iconos[categoria] || '📦';
}

function crearDato(titulo, valor, icono) {
    const dato = document.createElement('div');
    dato.className = 'cm-detail-fact';
    agregarTexto(dato, 'span', 'cm-detail-fact-icon', icono);
    const texto = document.createElement('div');
    agregarTexto(texto, 'small', '', titulo);
    agregarTexto(texto, 'strong', '', valor);
    dato.appendChild(texto);
    return dato;
}

function mostrarArticulo(datos) {
    articulo = datos;
    document.title = articulo.title + ' | CorilloMarket';
    detalleArticulo.replaceChildren();

    const visual = document.createElement('div');
    visual.className = 'cm-detail-visual';
    agregarTexto(visual, 'span', 'cm-detail-category', articulo.category);
    agregarTexto(visual, 'span', 'cm-detail-icon', iconoCategoria(articulo.category));
    agregarTexto(visual, 'span', 'cm-detail-visual-caption', 'Una buena vuelta puede estar aquí');

    const contenido = document.createElement('div');
    contenido.className = 'cm-detail-content';

    const precio = document.createElement('div');
    precio.className = 'cm-detail-price-row';
    agregarTexto(precio, 'strong', 'cm-detail-price',
        'RD$ ' + Number(articulo.price).toLocaleString('es-DO'));
    agregarTexto(precio, 'span', 'cm-detail-state', 'Disponible');
    contenido.appendChild(precio);

    agregarTexto(contenido, 'h1', 'cm-detail-title', articulo.title);
    agregarTexto(contenido, 'h2', 'cm-detail-section-title', 'Sobre este artículo');
    agregarTexto(contenido, 'p', 'cm-detail-description', articulo.description);

    const caracteristicas = document.createElement('div');
    caracteristicas.className = 'cm-detail-facts';
    caracteristicas.appendChild(crearDato('Vendedor', articulo.sellerName, '👤'));
    caracteristicas.appendChild(crearDato('Zona', 'Santo Domingo, República Dominicana', '⌖'));
    contenido.appendChild(caracteristicas);

    const encuentro = document.createElement('div');
    encuentro.className = 'cm-detail-meetup';
    agregarTexto(encuentro, 'span', 'cm-detail-meetup-pin', '⌖');
    const datosEncuentro = document.createElement('div');
    agregarTexto(datosEncuentro, 'strong', '', 'Punto de encuentro');
    agregarTexto(datosEncuentro, 'small', '', 'La ubicación se coordina por mensajes.');
    encuentro.appendChild(datosEncuentro);
    contenido.appendChild(encuentro);

    const acciones = document.createElement('div');
    acciones.className = 'cm-detail-actions';
    if (!usuario) {
        const enlace = agregarTexto(acciones, 'a', 'cm-button cm-button-primary', 'Inicia sesión para contactar');
        enlace.href = window.rutas.login;
    } else if (usuario.id === articulo.sellerId) {
        agregarTexto(acciones, 'p', 'cm-form-note', 'Esta publicación está en tu espacio de venta.');
        const botonEliminar = agregarTexto(acciones, 'button', 'cm-button cm-button-danger', 'Eliminar publicación');
        botonEliminar.type = 'button';
        botonEliminar.addEventListener('click', eliminarPublicacion);
    } else {
        const botonMensaje = agregarTexto(acciones, 'button', 'cm-button cm-button-primary', 'Enviar mensaje al vendedor');
        botonMensaje.type = 'button';
        botonMensaje.addEventListener('click', function () {
            abrirMensajes({ id: articulo.sellerId, name: articulo.sellerName });
        });
    }
    contenido.appendChild(acciones);
    detalleArticulo.append(visual, contenido);
}

async function eliminarPublicacion() {
    const confirmar = window.confirm('¿Seguro que quieres eliminar esta publicación? También se eliminarán sus mensajes.');
    if (!confirmar) {
        return;
    }

    try {
        await enviarPeticion('delete-listing', { listingId: articulo.id });
        window.location.href = window.rutas.inicio;
    } catch (error) {
        mostrarAviso(error.message);
    }
}
async function cargarArticulo() {
    try {
        const respuestaEstado = await fetch(api + '?action=status');
        const estado = await respuestaEstado.json();
        csrfToken = estado.csrfToken;
        usuario = estado.user;

        const respuesta = await fetch(api + '?action=get-listing&id=' + encodeURIComponent(articuloId));
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(resultado.message);
        }
        mostrarArticulo(resultado.listing);

        if (personaId && usuario) {
            const datos = estado.chats.find(function (hilo) {
                return hilo.listingId === articuloId && hilo.personaId === personaId;
            });
            if (datos) {
                abrirMensajes({ id: datos.personaId, name: datos.personaNombre });
            }
        }
    } catch (error) {
        mostrarAviso(error.message);
    }
}

async function enviarMensaje(evento) {
    evento.preventDefault();
    const texto = entradaMensaje.value.trim();
    if (!texto || !articulo || !usuario) {
        return;
    }
    try {
        await enviarPeticion('send-message', {
            listingId: articulo.id,
            personaId: persona ? persona.id : '',
            text: texto
        });
        entradaMensaje.value = '';
        await actualizarMensajes();
    } catch (error) {
        mostrarAviso(error.message);
    }
}

botonAtras.addEventListener('click', cerrarMensajes);
formularioChat.addEventListener('submit', enviarMensaje);
cargarArticulo();
