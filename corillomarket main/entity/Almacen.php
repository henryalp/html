<?php

class Almacen
{
    private static $archivo = null;

    public static function iniciar(): void
    {
        if (is_resource(self::$archivo)) {
            return;
        }

        $ruta = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'corillomarket.dat';
        self::$archivo = fopen($ruta, 'c+b');
        if (!is_resource(self::$archivo) || !flock(self::$archivo, LOCK_EX)) {
            self::$archivo = null;
            throw new RuntimeException('No se pudo abrir el almacén compartido.');
        }
    }

    public static function leer(): array
    {
        self::iniciar();
        rewind(self::$archivo);
        $contenido = stream_get_contents(self::$archivo);
        if ($contenido === '' || $contenido === false) {
            return self::vacio();
        }

        $datos = @unserialize($contenido, ['allowed_classes' => false]);
        if (!is_array($datos)) {
            throw new RuntimeException('El almacén compartido no se pudo leer.');
        }

        return array_merge(self::vacio(), $datos);
    }

    public static function guardar(array $datos): void
    {
        self::iniciar();
        rewind(self::$archivo);
        ftruncate(self::$archivo, 0);
        fwrite(self::$archivo, serialize($datos));
        fflush(self::$archivo);
    }

    public static function cerrar(): void
    {
        if (is_resource(self::$archivo)) {
            flock(self::$archivo, LOCK_UN);
            fclose(self::$archivo);
            self::$archivo = null;
        }
    }

    private static function vacio(): array
    {
        return [
            'users' => [],
            'listings' => [],
            'mensajes' => [],
        ];
    }
}