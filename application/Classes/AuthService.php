<?php

namespace App\Classes;

if (!defined('devsakura')) exit('denied');

use App\Classes\Core;
use PDO;

class AuthService {
  private ?PDO $database;
  private ?User $currentUser = null;

  public function __construct(Core $core) {
    $this->database = $core->database;
    $this->initSession();
  }

  private function initSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
      session_start();
    }

    if (!$this->database) {
      return;
    }

    if (isset($_SESSION['user_id'])) {
      try {
        $stmt = $this->database->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$_SESSION['user_id']]);
        $userData = $stmt->fetch();

        if ($userData) {
          $this->currentUser = new User($userData);
        } else {
          $this->logout();
        }
      } catch (\PDOException $e) {
        error_log("Auth session init error: " . $e->getMessage());
        $this->logout();
      }
    }
  }

  public function isAuth(): bool {
    return $this->currentUser !== null;
  }

  public function getUser(): ?User {
    return $this->currentUser;
  }

  public function login(string $login, string $password): bool {
    if (!$this->database) {
      return false;
    }

    try {
      $stmt = $this->database->prepare("SELECT * FROM users WHERE login = ? LIMIT 1");
      $stmt->execute([$login]);
      $userData = $stmt->fetch();

      if ($userData && password_verify($password, $userData['password'])) {
        $_SESSION['user_id'] = $userData['id'];
        $this->currentUser = new User($userData);
        return true;
      }
    } catch (\PDOException $e) {
      error_log("Login error: " . $e->getMessage());
    }

    return false;
  }

  public function logout(): void {
    $this->currentUser = null;
    unset($_SESSION['user_id']);
    if (session_status() === PHP_SESSION_ACTIVE) {
      session_destroy();
    }
  }

  /**
   * Генерирует хэш пароля с использованием алгоритма Bcrypt.
   */
  public function genPassword(string $string = ''): string {
    return password_hash($string, PASSWORD_BCRYPT, ['cost' => 12]);
  }

  /**
   * Проверяет, соответствует ли открытый пароль хэшу.
   */
  public function checkPassword($password1, $password2): bool {
    return password_verify($password1, $password2);
  }

  public static function createTmp() {
    return Core::random(16);
  }
}
