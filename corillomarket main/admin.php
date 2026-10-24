<?php

if (PHP_SAPI !== 'cli') {
    exit("Este archivo solo se usa desde la terminal.\n");
}

require_once __DIR__ . '/entity/Almacen.php';

function mostrarAyuda(): void
{
    echo "Administración local de CorilloMarket\n\n";
    echo "php admin.php sesiones\n";
    echo "php admin.php usuarios\n";
    echo "php admin.php articulos\n";
    echo "php admin.php mensajes\n";
    echo "php admin.php banear <usuarioId>\n";
    echo "php admin.php desbanear <usuarioId>\n";
    echo "php admin.php quitar-usuario <usuarioId>\n";
    echo "php admin.php quitar-articulo <articuloId>\n";
    echo "php admin.php quitar-mensaje <mensajeId>\n";
}

function mostrarResumen(array $datos): void
{
    printf(
        "Datos compartidos | usuarios: %d | artículos: %d | mensajes: %d\n",
        count($datos['users']),
        count($datos['listings']),
        count($datos['mensajes'])
    );
}

function mostrarUsuarios(array $datos): void
{
    foreach ($datos['users'] as $usuario) {
        printf(
            "%s | %s | cédula: %s | correo: %s | dirección: %s | %s\n",
            $usuario['id'],
            $usuario['name'],
            $usuario['cedula'],
            $usuario['correo'] ?? 'sin correo',
            $usuario['direccion'] ?? 'sin dirección',
            ($usuario['baneado'] ?? false) ? 'baneado' : 'activo'
        );
    }
}

function mostrarArticulos(array $datos): void
{
    foreach ($datos['listings'] as $articulo) {
        printf(
            "%s | %s | vendedor: %s | RD$ %s\n",
            $articulo['id'],
            $articulo['title'],
            $articulo['sellerName'],
            number_format((float) $articulo['price'], 2)
        );
    }
}

function mostrarMensajes(array $datos): void
{
    foreach ($datos['mensajes'] as $mensaje) {
        printf(
            "%s | artículo: %s | %s -> %s | %s\n",
            $mensaje['id'],
            $mensaje['articuloId'],
            $mensaje['emisorNombre'],
            $mensaje['receptorNombre'],
            $mensaje['texto']
        );
    }
}

function quitarUsuario(array &$datos, string $id): bool
{
    if (!isset($datos['users'][$id])) {
        return false;
    }

    unset($datos['users'][$id]);
    foreach ($datos['listings'] as $articuloId => $articulo) {
        if ($articulo['sellerId'] === $id) {
            unset($datos['listings'][$articuloId]);
        }
    }
    foreach ($datos['mensajes'] as $mensajeId => $mensaje) {
        if ($mensaje['emisorId'] === $id || $mensaje['receptorId'] === $id) {
            unset($datos['mensajes'][$mensajeId]);
        }
    }

    return true;
}

function ejecutar(string $comando, array &$datos): bool
{
    $id = $GLOBALS['argv'][2] ?? '';

    if ($comando === 'sesiones') {
        mostrarResumen($datos);
        return false;
    }
    if ($comando === 'usuarios') {
        mostrarUsuarios($datos);
        return false;
    }
    if ($comando === 'articulos') {
        mostrarArticulos($datos);
        return false;
    }
    if ($comando === 'mensajes') {
        mostrarMensajes($datos);
        return false;
    }
    if ($comando === 'banear' || $comando === 'desbanear') {
        if (!isset($datos['users'][$id])) {
            echo "No se encontró ese usuario.\n";
            return false;
        }
        $datos['users'][$id]['baneado'] = $comando === 'banear';
        echo $comando === 'banear' ? "Cuenta baneada.\n" : "Cuenta habilitada.\n";
        return true;
    }
    if ($comando === 'quitar-usuario') {
        $quitado = quitarUsuario($datos, $id);
        echo $quitado ? "Usuario y sus datos eliminados.\n" : "No se encontró ese usuario.\n";
        return $quitado;
    }
    if ($comando === 'quitar-articulo') {
        if (!isset($datos['listings'][$id])) {
            echo "No se encontró ese artículo.\n";
            return false;
        }
        unset($datos['listings'][$id]);
        foreach ($datos['mensajes'] as $mensajeId => $mensaje) {
            if ($mensaje['articuloId'] === $id) {
                unset($datos['mensajes'][$mensajeId]);
            }
        }
        echo "Artículo y sus mensajes eliminados.\n";
        return true;
    }
    if ($comando === 'quitar-mensaje') {
        if (!isset($datos['mensajes'][$id])) {
            echo "No se encontró ese mensaje.\n";
            return false;
        }
        unset($datos['mensajes'][$id]);
        echo "Mensaje eliminado.\n";
        return true;
    }

    mostrarAyuda();
    return false;
}

$comando = $argv[1] ?? 'ayuda';
if ($comando === 'ayuda' || $comando === '--help') {
    mostrarAyuda();
    exit;
}

Almacen::iniciar();
try {
    $datos = Almacen::leer();
    if (ejecutar($comando, $datos)) {
        Almacen::guardar($datos);
    }
} finally {
    Almacen::cerrar();
}