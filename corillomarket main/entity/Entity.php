<?php

abstract class Entity
{
    public ?string $id = null;

    public function asignar(array $valores): void
    {
        foreach ($valores as $campo => $valor) {
            if (property_exists($this, $campo) && $campo !== 'id') {
                $this->$campo = $valor;
            }
        }
    }

    public function guardar(array &$registros): bool
    {
        if ($this->id === null) {
            $this->id = bin2hex(random_bytes(8));
        }

        $registros[$this->id] = $this->aArray();
        return true;
    }

    public function eliminar(array &$registros): bool
    {
        if ($this->id === null || !isset($registros[$this->id])) {
            return false;
        }

        unset($registros[$this->id]);
        return true;
    }

    public static function obtener(string $id, array $registros): ?array
    {
        return $registros[$id] ?? null;
    }

    public static function obtenerTodos(array $registros): array
    {
        return array_values($registros);
    }

    public function aArray(): array
    {
        return get_object_vars($this);
    }
}
