<?php

namespace App\Classes;

use PDO;
use PDOStatement;
use PDOException;

if (!defined('devsakura')) exit('Denied');

class Database {
  public ?PDO $pdo = null;
  public PDOStatement|false $stmt = false;
  protected Core $core;
  protected array $config;
  public bool $connected = false;
  public ?string $error = null;

  public function __construct(Core $core) {
    $this->core = $core;
    // Извлекаем конфигурацию БД напрямую из объекта Config
    $this->config = $core->config->database ?? [];

    $this->connect(
      $_ENV['DB_HOST'] ?? '127.0.0.1',
      $_ENV['DB_USER'] ?? 'root',
      $_ENV['DB_PASS'] ?? '',
      $_ENV['DB_BASE'] ?? 'base',
      $_ENV['DB_PORT'] ?? 3306
    );
  }

  public function connect(string $host, string $user, string $pass, string $base, int $port): bool {
    $dsn = "mysql:host={$host};port={$port};dbname={$base};charset=utf8mb4";
    $options = [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ];

    try {
      $this->pdo = new PDO($dsn, $user, $pass, $options);
      $this->connected = true;
      return true;
    } catch (PDOException $e) {
      $this->pdo = null;
      $this->connected = false;
      $this->error = $e->getMessage();
      return false;
    }
  }

  public function isConnected(): bool {
    return $this->connected;
  }

  public function getError(): ?string {
    return $this->error;
  }

  /**
   * Подготовка SQL запроса (возвращает PDOStatement или false)
   */
  public function prepare(string $sql): PDOStatement|false {
    if (!$this->pdo) return false;
    try {
      $this->stmt = $this->pdo->prepare($sql);
      return $this->stmt;
    } catch (PDOException $e) {
      $this->error = $e->getMessage();
      error_log("SQL Prepare Error: " . $this->error . " | SQL: " . $sql);
      return false;
    }
  }

  /**
   * Выполнение подготовленного запроса с передачей параметров
   */
  public function execute(array $params = []): bool {
    if (!$this->stmt) return false;
    try {
      return $this->stmt->execute($params);
    } catch (PDOException $e) {
      $this->error = $e->getMessage();
      error_log("SQL Execute Error: " . $this->error);
      return false;
    }
  }

  /**
   * Универсальный метод: готовит и сразу выполняет запрос с параметрами.
   * Возвращает текущий экземпляр класса для цепочки методов (Method Chaining).
   */
  public function query(string $sql, array $params = []): self {
    $this->error = null;
    if ($this->prepare($sql)) {
      $this->execute($params);
    }
    return $this;
  }

  /**
   * Получение ОДНОЙ строки (ассоциативный массив) из результата запроса.
   * Пример: $db->query("SELECT * FROM users WHERE id = ?", [1])->fetch();
   */
  public function fetch() {
    return $this->stmt ? $this->stmt->fetch() : false;
  }

  /**
   * Получение ВСЕХ строк (массив ассоциативных массивов).
   * Пример: $db->query("SELECT * FROM users WHERE status = ?", ['active'])->fetchAll();
   */
  public function fetchAll(): array {
    return $this->stmt ? $this->stmt->fetchAll() : [];
  }

  /**
   * Получение конкретного одного поля из первой строки.
   * Удобно для COUNT(), проверки существования.
   * Пример: $count = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
   */
  public function fetchColumn(int $columnNumber = 0) {
    return $this->stmt ? $this->stmt->fetchColumn($columnNumber) : false;
  }

  public function affectedRows(): int {
    return $this->stmt ? $this->stmt->rowCount() : 0;
  }

  public function insertId(): string|false {
    return $this->pdo?->lastInsertId();
  }

  public function safesql(string $string): string {
    if (!$this->pdo) {
      return addslashes($string);
    }
    return $this->pdo->quote($string);
  }

  public function HSC(?string $string = ''): string {
    return htmlspecialchars($string ?? '', ENT_QUOTES, 'UTF-8');
  }

  public function beginTransaction(): bool {
    if (!$this->pdo) return false;
    try {
      return $this->pdo->beginTransaction();
    } catch (PDOException $e) {
      error_log("Begin transaction failed: " . $e->getMessage());
      return false;
    }
  }

  public function commit(): bool {
    if (!$this->pdo) return false;
    try {
      return $this->pdo->commit();
    } catch (PDOException $e) {
      error_log("Commit failed: " . $e->getMessage());
      return false;
    }
  }

  public function rollBack(): bool {
    if (!$this->pdo) return false;
    try {
      return $this->pdo->rollBack();
    } catch (PDOException $e) {
      error_log("Rollback failed: " . $e->getMessage());
      return false;
    }
  }

  public function __destruct() {
    $this->stmt = false;
    $this->pdo = null;
  }
}
