<?php

namespace App\Classes;

use PDO;
use PDOException;

if (!defined('devsakura')) exit('Denied');

class Database {
  protected ?PDO $pdo = null;
  public ?string $error = null;

  public function __construct() {
    $host = $_ENV['DB_HOST'] ?? '127.0.0.1';
    $user = $_ENV['DB_USER'] ?? 'root';
    $pass = $_ENV['DB_PASS'] ?? '';
    $base = $_ENV['DB_BASE'] ?? 'base';
    $port = $_ENV['DB_PORT'] ?? 3306;

    $dsn = "mysql:host={$host};port={$port};dbname={$base};charset=utf8mb4";
    $options = [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
      $this->pdo = new PDO($dsn, $user, $pass, $options);
    } catch (PDOException $e) {
      $this->error = $e->getMessage();
      error_log("Database connection failed: " . $this->error);
    }
  }

  /**
   * Возвращает чистый объект PDO или null в случае ошибки
   */
  public function getConnection(): ?PDO {
    return $this->pdo;
  }
}
