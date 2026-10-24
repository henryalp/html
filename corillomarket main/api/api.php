<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../entity/Listing.php';
require_once __DIR__ . '/../entity/Mensaje.php';
require_once __DIR__ . '/../entity/Usuario.php';
require_once __DIR__ . '/../entity/Almacen.php';

if (!isset($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(24));
}

Almacen::iniciar();
register_shutdown_function([Almacen::class, 'cerrar']);

function responder(array $respuesta, int $codigoEstado = 200): void
{
    http_response_code($codigoEstado);
    echo json_encode($respuesta, JSON_UNESCAPED_UNICODE);
    exit;
}

function leerPeticion(): array
{
    $cuerpo = json_decode(file_get_contents('php://input'), true);
    return is_array($cuerpo) ? $cuerpo : [];
}

function almacenVacio(): array
{
    return [
        'users' => [],
        'listings' => [],
        'mensajes' => [],
    ];
}

function leerAlmacen(): array
{
    $datos = Almacen::leer();
    if (!($_SESSION['almacenGlobal'] ?? false)) {
        $anteriores = json_decode($_SESSION['datos'] ?? '', true);
        $migrado = false;

        if (is_array($anteriores)) {
            foreach (['users', 'listings', 'mensajes'] as $coleccion) {
                foreach (($anteriores[$coleccion] ?? []) as $id => $registro) {
                    if (!isset($datos[$coleccion][$id])) {
                        $datos[$coleccion][$id] = $registro;
                        $migrado = true;
                    }
                }
            }
        }

        unset($_SESSION['datos']);
        $_SESSION['almacenGlobal'] = true;
        if ($migrado) {
            Almacen::guardar($datos);
        }
    }

    return array_merge(almacenVacio(), $datos);
}

function guardarAlmacen(array $datos): void
{
    Almacen::guardar($datos);
}function usuarioActual(array $datos): ?array
{
    $usuarioId = $_SESSION['idUsuario'] ?? null;
    if ($usuarioId === null) {
        return null;
    }

    $usuario = buscarUsuario($datos['users'], $usuarioId);
    if ($usuario === null || ($usuario['baneado'] ?? false)) {
        return null;
    }

    return $usuario;
}

function usuarioPublico(?array $usuario): ?array
{
    if ($usuario === null) {
        return null;
    }

    return [
        'id' => $usuario['id'],
        'name' => $usuario['name'],
    ];
}

function validarToken(array $peticion): void
{
    $token = $peticion['csrfToken'] ?? '';
    if (!hash_equals($_SESSION['csrf'], (string) $token)) {
        responder([
            'success' => false,
            'message' => 'La sesión expiró. Recarga la página.',
        ], 403);
    }
}

function buscarCedula(array $usuarios, string $cedula): ?array
{
    foreach ($usuarios as $usuario) {
        if ($usuario['cedula'] === $cedula) {
            return $usuario;
        }
    }

    return null;
}

function buscarCorreo(array $usuarios, string $correo): ?array
{
    foreach ($usuarios as $usuario) {
        if (strtolower($usuario['correo'] ?? '') === strtolower($correo)) {
            return $usuario;
        }
    }

    return null;
}
function buscarUsuario(array $usuarios, string $usuarioId): ?array
{
    foreach ($usuarios as $usuario) {
        if ($usuario['id'] === $usuarioId) {
            return $usuario;
        }
    }

    return null;
}

function contarArticulos(array $articulos, string $usuarioId): int
{
    $cantidad = 0;
    foreach ($articulos as $articulo) {
        if ($articulo['sellerId'] === $usuarioId) {
            $cantidad++;
        }
    }

    return $cantidad;
}

function mensajesUsuario(array $datos, array $usuario): array
{
    $hilos = [];
    foreach ($datos['mensajes'] as $mensaje) {
        if ($mensaje['emisorId'] !== $usuario['id'] && $mensaje['receptorId'] !== $usuario['id']) {
            continue;
        }

        $personaId = $mensaje['emisorId'] === $usuario['id']
            ? $mensaje['receptorId']
            : $mensaje['emisorId'];
        $personaNombre = $mensaje['emisorId'] === $usuario['id']
            ? $mensaje['receptorNombre']
            : $mensaje['emisorNombre'];
        $clave = $mensaje['articuloId'] . ':' . $personaId;

        $hilos[$clave] = [
            'listingId' => $mensaje['articuloId'],
            'listingTitle' => $mensaje['articuloTitulo'],
            'personaId' => $personaId,
            'personaNombre' => $personaNombre,
            'ultimoMensaje' => $mensaje['texto'],
        ];
    }

    return array_values($hilos);
}

function buscarMensajes(array $datos, string $articuloId, string $personaId, string $usuarioId): array
{
    $coincidencias = [];
    foreach ($datos['mensajes'] as $mensaje) {
        $mismoHilo = $mensaje['articuloId'] === $articuloId
            && (($mensaje['emisorId'] === $usuarioId && $mensaje['receptorId'] === $personaId)
                || ($mensaje['emisorId'] === $personaId && $mensaje['receptorId'] === $usuarioId));
        if ($mismoHilo) {
            $coincidencias[] = $mensaje;
        }
    }

    return $coincidencias;
}

function mostrarEstado(array $datos): void
{
    $usuario = usuarioActual($datos);
    $articulos = Listing::obtenerTodos($datos['listings']);

    foreach ($articulos as &$articulo) {
        $articulo['isMine'] = $usuario !== null && $articulo['sellerId'] === $usuario['id'];
    }
    unset($articulo);

    $conversaciones = $usuario === null ? [] : mensajesUsuario($datos, $usuario);
    $cantidadArticulos = $usuario === null
        ? 0
        : contarArticulos($datos['listings'], $usuario['id']);

    responder([
        'success' => true,
        'csrfToken' => $_SESSION['csrf'],
        'user' => usuarioPublico($usuario),
        'listings' => $articulos,
        'listingCount' => $cantidadArticulos,
        'chats' => $conversaciones,
    ]);
}

function registrar(array $peticion, array &$datos): void
{
    $nombre = trim((string) ($peticion['name'] ?? ''));
    $cedula = preg_replace('/\D+/', '', (string) ($peticion['cedula'] ?? ''));
    $correo = trim((string) ($peticion['correo'] ?? ''));
    $direccion = trim((string) ($peticion['direccion'] ?? ''));
    $clave = (string) ($peticion['password'] ?? '');

    if (mb_strlen($nombre) < 2 || mb_strlen($nombre) > 80
        || strlen($cedula) < 9 || strlen($cedula) > 11
        || !filter_var($correo, FILTER_VALIDATE_EMAIL) || mb_strlen($correo) > 150
        || mb_strlen($direccion) < 5 || mb_strlen($direccion) > 160
        || strlen($clave) < 8) {
        responder([
            'success' => false,
            'message' => 'Revisa el nombre, la cédula, el correo, la dirección y la contraseña (8 caracteres mínimo).',
        ], 422);
    }

    if (buscarCedula($datos['users'], $cedula) !== null) {
        responder([
            'success' => false,
            'message' => 'Ya existe una cuenta con esa cédula.',
        ], 409);
    }

    if (buscarCorreo($datos['users'], $correo) !== null) {
        responder([
            'success' => false,
            'message' => 'Ya existe una cuenta con ese correo.',
        ], 409);
    }
    $cuenta = new Usuario();
    $cuenta->asignar([
        'name' => $nombre,
        'cedula' => $cedula,
        'correo' => $correo,
        'direccion' => $direccion,
        'passwordHash' => password_hash($clave, PASSWORD_DEFAULT),
        'baneado' => false,
    ]);
    $cuenta->guardar($datos['users']);
    guardarAlmacen($datos);

    session_regenerate_id(true);
    $_SESSION['idUsuario'] = $cuenta->id;

    responder([
        'success' => true,
        'message' => 'Cuenta creada.',
        'user' => usuarioPublico($cuenta->aArray()),
    ]);
}

function iniciarSesion(array $peticion, array $datos): void
{
    $cedula = preg_replace('/\D+/', '', (string) ($peticion['cedula'] ?? ''));
    $usuario = buscarCedula($datos['users'], $cedula);
    $clave = (string) ($peticion['password'] ?? '');

    if ($usuario === null || ($usuario['baneado'] ?? false) || !password_verify($clave, $usuario['passwordHash'])) {
        responder([
            'success' => false,
            'message' => 'Cédula o contraseña incorrectas.',
        ], 401);
    }

    session_regenerate_id(true);
    $_SESSION['idUsuario'] = $usuario['id'];

    responder([
        'success' => true,
        'message' => 'Sesión iniciada.',
        'user' => usuarioPublico($usuario),
    ]);
}

function cerrarSesion(): void
{
    unset($_SESSION['idUsuario']);
    session_regenerate_id(true);
    responder([
        'success' => true,
        'message' => 'Sesión cerrada.',
    ]);
}

function publicarArticulo(array $peticion, array &$datos): void
{
    $usuario = usuarioActual($datos);
    if ($usuario === null) {
        responder(['success' => false, 'message' => 'Inicia sesión para publicar.'], 401);
    }

    $titulo = trim((string) ($peticion['title'] ?? ''));
    $descripcion = trim((string) ($peticion['description'] ?? ''));
    $categoria = (string) ($peticion['category'] ?? '');
    $precio = $peticion['price'] ?? 0;
    $categorias = [
        'Electrónica', 'Hogar', 'Moda', 'Deportes',
        'Vehículos', 'Coleccionables', 'Otros',
    ];

    $datosValidos = mb_strlen($titulo) >= 2 && mb_strlen($titulo) <= 80
        && mb_strlen($descripcion) >= 2 && mb_strlen($descripcion) <= 500
        && in_array($categoria, $categorias, true)
        && is_numeric($precio) && $precio > 0;

    if (!$datosValidos) {
        responder(['success' => false, 'message' => 'Revisa los datos del artículo.'], 422);
    }

    $articulo = new Listing();
    $articulo->asignar([
        'sellerId' => $usuario['id'],
        'sellerName' => $usuario['name'],
        'title' => $titulo,
        'description' => $descripcion,
        'category' => $categoria,
        'price' => (float) $precio,
        'createdAt' => date('c'),
    ]);
    $articulo->guardar($datos['listings']);
    guardarAlmacen($datos);

    responder(['success' => true, 'message' => 'Artículo publicado.']);
}

function verArticulo(array $datos): void
{
    $id = (string) ($_GET['id'] ?? '');
    $articulo = Listing::obtener($id, $datos['listings']);

    if ($articulo === null) {
        responder(['success' => false, 'message' => 'Artículo no encontrado.'], 404);
    }

    responder(['success' => true, 'listing' => $articulo]);
}

function eliminarArticulo(array $peticion, array &$datos): void
{
    $usuario = usuarioActual($datos);
    if ($usuario === null) {
        responder(['success' => false, 'message' => 'Inicia sesión para administrar tus publicaciones.'], 401);
    }

    $articuloId = (string) ($peticion['listingId'] ?? '');
    $articulo = Listing::obtener($articuloId, $datos['listings']);
    if ($articulo === null) {
        responder(['success' => false, 'message' => 'Publicación no encontrada.'], 404);
    }
    if ($articulo['sellerId'] !== $usuario['id']) {
        responder(['success' => false, 'message' => 'Solo el dueño puede quitar esta publicación.'], 403);
    }

    unset($datos['listings'][$articuloId]);
    foreach ($datos['mensajes'] as $mensajeId => $mensaje) {
        if ($mensaje['articuloId'] === $articuloId) {
            unset($datos['mensajes'][$mensajeId]);
        }
    }

    guardarAlmacen($datos);
    responder(['success' => true, 'message' => 'Publicación eliminada.']);
}
function verMensajes(array $datos): void
{
    $usuario = usuarioActual($datos);
    if ($usuario === null) {
        responder(['success' => false, 'message' => 'Inicia sesión para ver tus mensajes.'], 401);
    }

    $articuloId = (string) ($_GET['listingId'] ?? '');
    $personaId = (string) ($_GET['persona'] ?? '');
    $articulo = Listing::obtener($articuloId, $datos['listings']);
    $participa = $articulo !== null
        && ($articulo['sellerId'] === $usuario['id'] || $articulo['sellerId'] === $personaId);
    if (!$participa || $personaId === $usuario['id']) {
        responder(['success' => false, 'message' => 'Mensajes no encontrados.'], 404);
    }

    responder([
        'success' => true,
        'hilo' => [
            'listingId' => $articuloId,
            'listingTitle' => $articulo['title'],
            'personaId' => $personaId,
            'personaNombre' => buscarUsuario($datos['users'], $personaId)['name'] ?? $articulo['sellerName'],
            'messages' => buscarMensajes($datos, $articuloId, $personaId, $usuario['id']),
        ],
    ]);
}

function enviarMensaje(array $peticion, array &$datos): void
{
    $usuario = usuarioActual($datos);
    if ($usuario === null) {
        responder(['success' => false, 'message' => 'Inicia sesión para enviar mensajes.'], 401);
    }

    $articuloId = (string) ($peticion['listingId'] ?? '');
    $articulo = Listing::obtener($articuloId, $datos['listings']);
    if ($articulo === null) {
        responder(['success' => false, 'message' => 'Artículo no encontrado.'], 404);
    }

    $receptorId = $articulo['sellerId'];
    if ($receptorId === $usuario['id']) {
        $receptorId = (string) ($peticion['personaId'] ?? '');
        $hiloValido = buscarMensajes($datos, $articuloId, $receptorId, $usuario['id']) !== [];
        if (!$hiloValido) {
            responder(['success' => false, 'message' => 'No hay un comprador para responder.'], 404);
        }
    }

    $texto = trim((string) ($peticion['text'] ?? ''));
    if ($texto === '' || mb_strlen($texto) > 1000) {
        responder(['success' => false, 'message' => 'Escribe un mensaje de hasta 1,000 caracteres.'], 422);
    }

    $receptor = buscarUsuario($datos['users'], $receptorId);
    if ($receptor === null) {
        responder(['success' => false, 'message' => 'Destinatario no encontrado.'], 404);
    }

    $mensaje = new Mensaje();
    $mensaje->asignar([
        'emisorId' => $usuario['id'],
        'emisorNombre' => $usuario['name'],
        'receptorId' => $receptor['id'],
        'receptorNombre' => $receptor['name'],
        'articuloId' => $articuloId,
        'articuloTitulo' => $articulo['title'],
        'texto' => $texto,
        'fecha' => date('c'),
    ]);
    $mensaje->guardar($datos['mensajes']);
    guardarAlmacen($datos);

    responder(['success' => true, 'message' => $mensaje->aArray()]);
}

$datos = leerAlmacen();
$accion = $_GET['action'] ?? '';
$metodo = $_SERVER['REQUEST_METHOD'];

if ($accion === 'status' && $metodo === 'GET') {
    mostrarEstado($datos);
}

if ($accion === 'get-listing' && $metodo === 'GET') {
    verArticulo($datos);
}

if ($accion === 'get-thread' && $metodo === 'GET') {
    verMensajes($datos);
}

if ($metodo !== 'POST') {
    responder(['success' => false, 'message' => 'Solicitud no válida.'], 405);
}

$peticion = leerPeticion();
validarToken($peticion);

switch ($accion) {
    case 'register':
        registrar($peticion, $datos);
        break;
    case 'login':
        iniciarSesion($peticion, $datos);
        break;
    case 'logout':
        cerrarSesion();
        break;
    case 'add-listing':
        publicarArticulo($peticion, $datos);
        break;
    case 'delete-listing':
        eliminarArticulo($peticion, $datos);
        break;
    case 'get-listing':
        verArticulo($datos);
        break;
    case 'get-thread':
        verMensajes($datos);
        break;
    case 'send-message':
        enviarMensaje($peticion, $datos);
        break;
    default:
        responder(['success' => false, 'message' => 'Acción no encontrada.'], 404);
}


