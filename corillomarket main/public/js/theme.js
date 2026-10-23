const themeToggle = document.querySelector("[data-theme-toggle]");
const themeIcon = document.querySelector("[data-theme-icon]");
const page = document.body;
const themeStorageKey = "corillomarket-theme";

function applyTheme(theme) {
    const isLightTheme = theme === "light";
    page.dataset.theme = isLightTheme ? "light" : "dark";

    if (themeToggle) {
        themeToggle.setAttribute("aria-pressed", String(isLightTheme));
        themeToggle.title = isLightTheme ? "Cambiar a modo oscuro" : "Cambiar a modo claro";
    }

    if (themeIcon) {
        themeIcon.textContent = isLightTheme ? "☾" : "☼";
    }
}

function changeTheme() {
    const nextTheme = page.dataset.theme === "light" ? "dark" : "light";
    applyTheme(nextTheme);

    try {
        localStorage.setItem(themeStorageKey, nextTheme);
    } catch (error) {
        // El cambio funciona durante esta visita aunque no se pueda guardar la preferencia.
    }
}

let savedTheme = "dark";

try {
    savedTheme = localStorage.getItem(themeStorageKey) || "dark";
} catch (error) {
    // Si el almacenamiento no está disponible, se mantiene el tema oscuro predeterminado.
}

applyTheme(savedTheme);

if (themeToggle) {
    themeToggle.addEventListener("click", changeTheme);
}
