<?php

require_once __DIR__ . '/Entity.php';

class Mensaje extends Entity
{
    public string $emisorId = '';
    public string $emisorNombre = '';
    public string $receptorId = '';
    public string $receptorNombre = '';
    public string $articuloId = '';
    public string $articuloTitulo = '';
    public string $texto = '';
    public string $fecha = '';
}
