<?php

require_once __DIR__ . '/Entity.php';

class Listing extends Entity
{
    public string $sellerId = '';
    public string $sellerName = '';
    public string $title = '';
    public string $description = '';
    public string $category = 'Otros';
    public float $price = 0;
    public string $createdAt = '';
}
