(function () {
    var archivo = document.currentScript;
    var raiz = new URL('../../../', archivo.src);

    window.rutas = {
        inicio: new URL('index.html', raiz).href,
        login: new URL('index.html?login=1', raiz).href,
        registro: new URL('public/front/registro.html', raiz).href,
        registroExitoso: new URL('index.html?registro=exitoso', raiz).href,
        producto: new URL('public/front/producto.html', raiz).href,
        chats: new URL('public/front/chats.html', raiz).href,
        api: new URL('api/api.php', raiz).href,
        estilo: new URL('public/front/style/style.css', raiz).href,
        tema: new URL('public/front/js/theme.js', raiz).href
    };

    function ponerEstilo() {
        var estilo = document.createElement('link');
        estilo.rel = 'stylesheet';
        estilo.href = window.rutas.estilo;
        document.head.appendChild(estilo);
    }

    function ponerEnlaces() {
        var enlaces = document.querySelectorAll('[data-ruta]');
        enlaces.forEach(function (enlace) {
            var nombre = enlace.dataset.ruta;
            if (window.rutas[nombre]) {
                enlace.href = window.rutas[nombre];
            }
        });
    }

    function ponerScripts() {
        var paginas = {
            inicio: 'app.js',
            registro: 'register.js',
            producto: 'producto.js',
            chats: 'chats.js'
        };
        var pagina = archivo.dataset.pagina;
        var scripts = [window.rutas.tema];

        if (paginas[pagina]) {
            scripts.push(new URL('public/front/js/' + paginas[pagina], raiz).href);
        }

        scripts.forEach(function (direccion) {
            var script = document.createElement('script');
            script.src = direccion;
            document.body.appendChild(script);
        });
    }

    ponerEstilo();
    ponerEnlaces();
    ponerScripts();
}());