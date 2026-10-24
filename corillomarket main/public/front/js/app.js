const api = window.rutas.api;
const rejilla = document.getElementById('cm-product-grid');
const dialogoLogin = document.getElementById('cm-login-dialog');
const dialogoArticulo = document.getElementById('cm-listing-dialog');
const formularioLogin = document.getElementById('cm-login-form');
const formularioArticulo = document.getElementById('cm-listing-form');

let token = '';
let usuario = null;
let articulos = [];
let categoria = 'Todas';

function mostrarAviso(texto, esError) {
    const aviso = document.getElementById('cm-notice');
    aviso.textContent = texto;
    aviso.className = esError ? 'cm-notice cm-notice-error' : 'cm-notice';
    aviso.hidden = false;
}

function mostrarMensaje(selector, texto) {
    const mensaje = document.querySelector(selector);
    mensaje.textContent = texto;
    mensaje.hidden = texto === '';
}

async function enviarPeticion(accion, datos) {
    datos.csrfToken = token;

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

function actualizarPagina(estado) {
    token = estado.csrfToken;
    usuario = estado.user;
    articulos = estado.listings || [];

    const zonaCuenta = document.querySelector('[data-account-area]');
    const botonLogin = document.querySelector('[data-open-login]');
    const enlaceRegistro = document.querySelector('.cm-navigation a[data-ruta="registro"]');

    zonaCuenta.hidden = !usuario;
    botonLogin.hidden = Boolean(usuario);
    enlaceRegistro.hidden = Boolean(usuario);

    if (usuario) {
        document.querySelector('[data-account-name]').textContent = 'Hola, ' + usuario.name;
        document.querySelector('[data-account-count]').textContent =
            (estado.listingCount || 0) + ' artículos publicados';
        document.querySelector('[data-chat-count]').textContent = (estado.chats || []).length;
        document.querySelector('[data-dialog-count]').textContent = estado.listingCount || 0;
    }

    mostrarArticulos();
}

function agregarTexto(padre, etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    elemento.className = clase;
    elemento.textContent = texto;
    padre.appendChild(elemento);
    return elemento;
}

function iconoCategoria(categoriaArticulo) {
    const iconos = {
        'Electrónica': '🎧',
        'Hogar': '🪑',
        'Moda': '👟',
        'Deportes': '⚽',
        'Vehículos': '🚲',
        'Coleccionables': '📷'
    };

    return iconos[categoriaArticulo] || '📦';
}

function crearTarjeta(articulo) {
    const tarjeta = document.createElement('a');
    tarjeta.className = 'cm-product-card';
    tarjeta.href = window.rutas.producto + '?id=' + encodeURIComponent(articulo.id);
    tarjeta.setAttribute('aria-label', 'Ver ' + articulo.title);

    const imagen = document.createElement('div');
    imagen.className = 'cm-product-card-image';
    agregarTexto(imagen, 'span', 'cm-product-card-placeholder', iconoCategoria(articulo.category));
    agregarTexto(imagen, 'span', 'cm-product-card-tag', articulo.category);

    const informacion = document.createElement('div');
    informacion.className = 'cm-product-card-info';
    agregarTexto(informacion, 'p', 'cm-product-card-price',
        'RD$ ' + Number(articulo.price).toLocaleString('es-DO'));
    agregarTexto(informacion, 'h3', 'cm-product-card-title', articulo.title);
    agregarTexto(informacion, 'p', 'cm-product-card-description', articulo.description);
    agregarTexto(informacion, 'p', 'cm-product-card-location', 'Santo Domingo, República Dominicana');
    agregarTexto(informacion, 'p', 'cm-product-card-seller', 'Publicado por ' + articulo.sellerName);

    tarjeta.append(imagen, informacion);
    return tarjeta;
}

function filtrarArticulos() {
    const busqueda = document.getElementById('cm-search-query').value.trim().toLowerCase();
    const orden = document.getElementById('cm-sort-order').value;
    let visibles = articulos.slice();

    if (categoria !== 'Todas') {
        visibles = visibles.filter(function (articulo) {
            return articulo.category === categoria;
        });
    }

    if (busqueda !== '') {
        visibles = visibles.filter(function (articulo) {
            const textoArticulo = articulo.title + articulo.description + articulo.category;
            return textoArticulo.toLowerCase().includes(busqueda);
        });
    }

    if (orden === 'menor-precio') {
        visibles.sort(function (primero, segundo) {
            return primero.price - segundo.price;
        });
    } else if (orden === 'mayor-precio') {
        visibles.sort(function (primero, segundo) {
            return segundo.price - primero.price;
        });
    } else {
        visibles.sort(function (primero, segundo) {
            return new Date(segundo.createdAt) - new Date(primero.createdAt);
        });
    }

    return visibles;
}

function mostrarArticulos() {
    const visibles = filtrarArticulos();
    rejilla.replaceChildren();

    if (visibles.length === 0) {
        const texto = articulos.length > 0
            ? 'No hay artículos que coincidan con tu búsqueda.'
            : 'Todavía no hay artículos. Inicia sesión y publica el primero.';
        agregarTexto(rejilla, 'p', 'cm-empty-state', texto);
        return;
    }

    visibles.forEach(function (articulo) {
        rejilla.appendChild(crearTarjeta(articulo));
    });
}

async function cargarPagina() {
    try {
        const respuesta = await fetch(api + '?action=status');
        const estado = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(estado.message || 'No se pudo consultar la sesión.');
        }
        actualizarPagina(estado);

        const parametros = new URLSearchParams(window.location.search);
        if (parametros.get('registro') === 'exitoso') {
            mostrarAviso('Tu cuenta está lista. ¡Bienvenido al corillo!', false);
        }
        if (parametros.get('login') === '1') {
            dialogoLogin.showModal();
        }
    } catch (error) {
        mostrarAviso('Abre el sitio desde XAMPP usando localhost.', true);
    }
}

function abrirLogin() {
    mostrarMensaje('[data-login-message]', '');
    dialogoLogin.showModal();
}

function abrirPublicacion() {
    if (!usuario) {
        abrirLogin();
        mostrarAviso('Inicia sesión para publicar.', false);
        return;
    }

    mostrarMensaje('[data-listing-message]', '');
    dialogoArticulo.showModal();
}

async function procesarLogin(evento) {
    evento.preventDefault();
    const valores = new FormData(formularioLogin);

    try {
        const resultado = await enviarPeticion('login', {
            cedula: valores.get('cedula'),
            password: valores.get('password')
        });
        dialogoLogin.close();
        formularioLogin.reset();
        await cargarPagina();
        mostrarAviso(resultado.message, false);
    } catch (error) {
        mostrarMensaje('[data-login-message]', error.message);
    }
}

async function publicarArticulo(evento) {
    evento.preventDefault();
    const valores = new FormData(formularioArticulo);

    try {
        const resultado = await enviarPeticion('add-listing', {
            title: valores.get('title'),
            category: valores.get('category'),
            price: valores.get('price'),
            description: valores.get('description')
        });
        dialogoArticulo.close();
        formularioArticulo.reset();
        await cargarPagina();
        mostrarAviso(resultado.message, false);
    } catch (error) {
        mostrarMensaje('[data-listing-message]', error.message);
    }
}

async function cerrarSesion() {
    try {
        const resultado = await enviarPeticion('logout', {});
        await cargarPagina();
        mostrarAviso(resultado.message, false);
    } catch (error) {
        mostrarAviso(error.message, true);
    }
}

function buscarArticulos(evento) {
    evento.preventDefault();
    mostrarArticulos();
}

function cambiarCategoria(evento) {
    const boton = evento.target.closest('[data-category]');
    if (!boton) {
        return;
    }

    categoria = boton.dataset.category;
    document.querySelectorAll('[data-category]').forEach(function (elemento) {
        elemento.classList.toggle('cm-category-chip-selected', elemento === boton);
    });
    mostrarArticulos();
}

document.querySelector('[data-open-login]').addEventListener('click', abrirLogin);
document.querySelector('[data-open-listing]').addEventListener('click', abrirPublicacion);
document.querySelector('[data-close-login]').addEventListener('click', function () {
    dialogoLogin.close();
});
document.querySelector('[data-close-listing]').addEventListener('click', function () {
    dialogoArticulo.close();
});
document.querySelector('[data-logout]').addEventListener('click', cerrarSesion);
formularioLogin.addEventListener('submit', procesarLogin);
formularioArticulo.addEventListener('submit', publicarArticulo);
document.getElementById('cm-search-form').addEventListener('submit', buscarArticulos);
document.getElementById('cm-search-query').addEventListener('input', mostrarArticulos);
document.getElementById('cm-sort-order').addEventListener('change', mostrarArticulos);
document.querySelector('[data-category-list]').addEventListener('click', cambiarCategoria);

cargarPagina();
