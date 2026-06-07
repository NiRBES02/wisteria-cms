<?php

namespace App\Classes;

if (!defined('devsakura')) exit('denied');

class AuthService {
  private Database $db;
  private ?User $currentUser = null;

  public function __construct(Database $db) {
    $this->db = $db;
    $this->initSession();
  }

  private function initSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
      session_start();
    }

    if (isset($_SESSION['user_id'])) {
      // Берем pdo из объекта Database (композиция)
      $stmt = $this->db->pdo->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
      $stmt->execute([$_SESSION['user_id']]);
      $userData = $stmt->fetch();

      if ($userData) {
        $this->currentUser = new User($userData);
      } else {
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
    $stmt = $this->db->pdo->prepare("SELECT * FROM users WHERE login = ? LIMIT 1");
    $stmt->execute([$login]);
    $userData = $stmt->fetch();

    if ($userData && password_verify($password, $userData['password'])) {
      $_SESSION['user_id'] = $userData['id'];
      $this->currentUser = new User($userData);
      return true;
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
}
