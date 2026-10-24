const formulario = document.getElementById('cm-register-form');
const aviso = document.getElementById('cm-register-message');
const botonEnviar = formulario.querySelector('button[type="submit"]');

const api = window.rutas.api;
let token = '';

function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.hidden = texto === '';
}

async function cargarToken() {
    botonEnviar.disabled = true;

    try {
        const respuesta = await fetch(api + '?action=status');
        const estado = await respuesta.json();
        token = estado.csrfToken;
        botonEnviar.disabled = false;
    } catch (error) {
        mostrarAviso('Abre esta página desde XAMPP usando localhost.');
    }
}

async function registrarCuenta(evento) {
    evento.preventDefault();
    botonEnviar.disabled = true;
    mostrarAviso('');

    const valores = new FormData(formulario);
    const datos = {
        name: valores.get('name'),
        cedula: valores.get('cedula'),
        correo: valores.get('correo'),
        direccion: valores.get('direccion'),
        password: valores.get('password'),
        csrfToken: token
    };

    try {
        const respuesta = await fetch(api + '?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(resultado.message || 'No se pudo crear la cuenta.');
        }

        window.location.href = window.rutas.registroExitoso;
    } catch (error) {
        mostrarAviso(error.message);
        botonEnviar.disabled = false;
    }
}

formulario.addEventListener('submit', registrarCuenta);
cargarToken();
