<?php

namespace App\Modules\Auth\Models;

use App\Classes\Core;
use App\Classes\Request;
use PDO;

if (!defined('devsakura')) exit('denied');

class ForgotResetPasswordModel {
  protected Core $core;
  protected PDO $database;

  private string $password = '';
  private string $token = '';

  public function __construct(Core $core) {
    $this->core = $core;
    $this->database = $core->database;
  }

  public function load(): void {
    if (!Request::isAjax() || !Request::isPost()) {
      $this->core->json(['notify' => ['message' => 'Метод не поддерживается', 'type' => 'error']]);
      return;
    }

    if ($this->core->auth->isAuth()) {
      $this->core->json(['notify' => ['message' => 'Вы уже авторизованы', 'type' => 'warning']]);
      return;
    }

    $this->token = trim($_POST['token'] ?? '');
    $this->password = isset($_POST['password']) ? (string) $_POST['password'] : '';

    if (empty($this->token)) {
      $this->core->json(['notify' => ['message' => 'Токен восстановления отсутствует', 'type' => 'error']]);
      return;
    }

    if (empty($this->password)) {
      $this->core->json(['notify' => ['message' => 'Новый пароль не указан', 'type' => 'warning']]);
      return;
    }

    if (mb_strlen($this->password, 'UTF-8') < 6) {
      $this->core->json(['notify' => ['message' => 'Новый пароль должен быть длиной не менее 6 символов', 'type' => 'warning']]);
      return;
    }

    $tokenHash = hash('sha256', $this->token);

    try {
      $stmt = $this->database->prepare('
                SELECT user_id 
                FROM users_forgot 
                WHERE token_hash = :token_hash
                LIMIT 1
            ');
      $stmt->execute(['token_hash' => $this->token]);
      $forgotRow = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (\PDOException $e) {
      $this->core->json(['notify' => ['message' => 'Ошибка базы данных при проверке сессии', 'type' => 'error']]);
      return;
    }

    if (!$forgotRow) {
      $this->core->json(['notify' => ['message' => 'Ссылка устарела или недействительна', 'type' => 'error']]);
      return;
    }

    $userId = (int)$forgotRow['user_id'];

    if (!$this->core->auth->changePassword($userId, $this->password)) {
      $this->core->json(['notify' => ['message' => 'Не удалось поменять пароль', 'type' => 'error']]);
      return;
    }

    try {
      $delStmt = $this->database->prepare('DELETE FROM users_forgot WHERE user_id = :user_id');
      $delStmt->execute(['user_id' => $userId]);
    } catch (\PDOException $e) {
      error_log("Failed to clear forgot token for user {$userId}: " . $e->getMessage());
    }

    $this->core->json([
      'notify' => ['message' => 'Вы успешно сменили пароль', 'type' => 'success']
    ]);
  }
}
