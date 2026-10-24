<?php

require_once __DIR__ . '/Entity.php';

class Usuario extends Entity
{
    public string $name = '';
    public string $cedula = '';
    public string $correo = '';
    public string $direccion = '';
    public string $passwordHash = '';
    public bool $baneado = false;
}
