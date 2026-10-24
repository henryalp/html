const api = window.rutas.api;
const listaMensajes = document.getElementById('chat-list');
const aviso = document.getElementById('chats-message');

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

function crearEnlace(hilo) {
    const enlace = document.createElement('a');
    enlace.className = 'cm-chat-list-item';
    enlace.href = window.rutas.producto + '?id=' + encodeURIComponent(hilo.listingId)
        + '&persona=' + encodeURIComponent(hilo.personaId);
    agregarTexto(enlace, 'strong', '', hilo.personaNombre);
    agregarTexto(enlace, 'span', '', hilo.listingTitle);
    agregarTexto(enlace, 'span', '', hilo.ultimoMensaje);
    return enlace;
}

async function cargarMensajes() {
    try {
        const respuesta = await fetch(api + '?action=status');
        const estado = await respuesta.json();
        if (!estado.user) {
            window.location.href = window.rutas.login;
            return;
        }
        if (!estado.chats || estado.chats.length === 0) {
            mostrarAviso('Todavía no tienes mensajes. Abre un artículo para escribirle a su vendedor.');
            return;
        }
        estado.chats.forEach(function (hilo) {
            listaMensajes.appendChild(crearEnlace(hilo));
        });
    } catch (error) {
        mostrarAviso('No se pudieron cargar tus mensajes. Abre el sitio desde XAMPP.');
    }
}

cargarMensajes();
