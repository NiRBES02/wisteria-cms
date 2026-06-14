<?php

namespace App\Classes;

if (!defined('devsakura')) exit('denied');

use App\Classes\Core;
use PDO;

class AuthService {
  private ?PDO $database;
  private ?User $currentUser = null;
  private string $sessionKey = 'ds_userId';

  /**
   * Конструктор AuthService.
   * @param Core $core
   */
  public function __construct(Core $core) {
    $this->database = $core->database;
    $this->initSession();
  }

  /**
   * Инициализирует сессию пользователя, проверяя как сессию PHP, так и постоянные куки.
   * @return void
   */
  private function initSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
      session_start();
    }

    if (!$this->database) {
      return;
    }

    if (isset($_SESSION[$this->sessionKey])) {
      $userId = intval($_SESSION[$this->sessionKey]);
      if ($this->loadUser($userId)) {
        return;
      }
    }

    if (isset($_COOKIE['ds_user'])) {
      $cookieData = explode('_', $_COOKIE['ds_user'], 2);

      if (count($cookieData) === 2) {
        $userId = intval($cookieData[0]);
        $cookieHash = $cookieData[1];

        $stmt = $this->database->prepare("SELECT id FROM sessions WHERE hash = ? LIMIT 1");
        $stmt->execute([$cookieHash]);
        $sessionExists = $stmt->fetch();

        if ($sessionExists && $this->loadUser($userId)) {
          $_SESSION[$this->sessionKey] = $userId;
          return;
        }
      }

      $this->clearCookie();
    }
  }

  /**
   * Загружает данные пользователя из базы данных и создает экземпляр объекта User.
   * @param int $userId
   * @return bool
   */
  private function loadUser(int $userId): bool {
    try {
      $stmt = $this->database->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
      $stmt->execute([$userId]);
      $userData = $stmt->fetch(PDO::FETCH_ASSOC);

      if ($userData) {
        $this->currentUser = new User($userData);
        return true;
      }
    } catch (\PDOException $e) {
      error_log("Auth user load error: " . $e->getMessage());
    }

    return false;
  }

  /**
   * Проверяет, аутентифицирован ли текущий пользователь.
   * @return bool
   */
  public function isAuth(): bool {
    return $this->currentUser !== null;
  }

  /**
   * Возвращает объект текущего аутентифицированного пользователя.
   * @return User|null
   */
  public function getUser(): ?User {
    return $this->currentUser;
  }

  /**
   * Аутентифицирует пользователя по логину и паролю.
   * @param string $login
   * @param string $password
   * @param bool $remember
   * @return bool
   */
  public function login(string $login, string $password, bool $remember = true): bool {
    if (!$this->database) {
      return false;
    }

    try {
      $stmt = $this->database->prepare("SELECT * FROM users WHERE login = ? LIMIT 1");
      $stmt->execute([$login]);
      $userData = $stmt->fetch(PDO::FETCH_ASSOC);

      if ($userData && password_verify($password, $userData['password'])) {
        $_SESSION[$this->sessionKey] = $userData['id'];
        $this->currentUser = new User($userData);

        if ($remember) {
          $this->createRememberMeSession($userData['id']);
        }

        return true;
      }
    } catch (\PDOException $e) {
      error_log("Login error: " . $e->getMessage());
    }

    return false;
  }

  /**
   * Создает долговечную куку "запомнить меня" и сохраняет её хэш в базе данных.
   * @param int $userId
   * @return void
   */
  private function createRememberMeSession(int $userId): void {
    $hash = self::createTmp();
    $currentIp = Core::ip();

    try {
      $stmt = $this->database->prepare("INSERT INTO sessions (uid, hash, ipCreate, ipLast) VALUES (?, ?, ?, ?)");
      $stmt->execute([$userId, $hash, $currentIp, $currentIp]);

      $cookieValue = $userId . '_' . $hash;

      setcookie('ds_user', $cookieValue, [
        'expires'  => time() + (86400 * 30),
        'path'     => '/',
        'domain'   => '',
        'secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
        'httponly' => true,
        'samesite' => 'Lax'
      ]);
    } catch (\PDOException $e) {
      error_log("Failed to create remember me session: " . $e->getMessage());
    }
  }

  /**
   * Разлогинивает текущего пользователя, уничтожая сессию и удаляет куку из БД.
   * @return void
   */
  public function logout(): void {
    if (isset($_COOKIE['ds_user'])) {
      $cookieData = explode('_', $_COOKIE['ds_user'], 2);
      if (count($cookieData) === 2 && $this->database) {
        try {
          $stmt = $this->database->prepare("DELETE FROM sessions WHERE hash = ?");
          $stmt->execute([$cookieData[1]]);
        } catch (\PDOException $e) {
          error_log("Logout DB error: " . $e->getMessage());
        }
      }
      $this->clearCookie();
    }

    $this->currentUser = null;
    unset($_SESSION[$this->sessionKey]);

    if (session_status() === PHP_SESSION_ACTIVE) {
      session_destroy();
    }
  }

  /**
   * Удаляет куку аутентификации из браузера.
   * @return void
   */
  private function clearCookie(): void {
    if (isset($_COOKIE['ds_user'])) {
      setcookie('ds_user', '', time() - 3600, '/');
      unset($_COOKIE['ds_user']);
    }
  }

  /**
   * Генерирует хэш пароля с использованием алгоритма Bcrypt.
   * @param string $string
   * @return string
   */
  public function genPassword(string $string = ''): string {
    return password_hash($string, PASSWORD_BCRYPT, ['cost' => 12]);
  }

  /**
   * Проверяет, соответствует ли пароль хэшу.
   * @param mixed $password1
   * @param mixed $password2
   * @return bool
   */
  public function checkPassword($password1, $password2): bool {
    return password_verify($password1, $password2);
  }

  /**
   * Генерирует случайный временный токен длиной 16 символов.
   * @return string
   */
  public static function createTmp(): string {
    return Core::random(16);
  }
}
