const botonTema = document.querySelector('[data-theme-toggle]');
const iconoTema = document.querySelector('[data-theme-icon]');
const pagina = document.body;
const claveTema = 'corillomarket-theme';

function aplicarTema(tema) {
    const modoClaro = tema === 'light';
    pagina.dataset.theme = modoClaro ? 'light' : 'dark';

    if (botonTema) {
        botonTema.setAttribute('aria-pressed', String(modoClaro));
        botonTema.title = modoClaro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
    }

    if (iconoTema) {
        iconoTema.textContent = modoClaro ? '☾' : '☼';
    }
}

function cambiarTema() {
    const temaSiguiente = pagina.dataset.theme === 'light' ? 'dark' : 'light';
    aplicarTema(temaSiguiente);

    try {
        localStorage.setItem(claveTema, temaSiguiente);
    } catch (error) {
        return;
    }
}

let temaGuardado = 'dark';

try {
    temaGuardado = localStorage.getItem(claveTema) || 'dark';
} catch (error) {
    temaGuardado = 'dark';
}

aplicarTema(temaGuardado);

if (botonTema) {
    botonTema.addEventListener('click', cambiarTema);
}
