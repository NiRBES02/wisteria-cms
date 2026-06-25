<?php

namespace App\Modules\Auth\Models;

use App\Classes\Core;
use App\Classes\Request;
use App\Classes\Mailer;
use PDO;

if (!defined('devsakura')) exit('denied');

class ForgotSendMailModel {
  protected Core $core;
  protected PDO $database;
  protected Mailer $mailer;

  public function __construct(Core $core) {
    $this->core = $core;
    $this->database = $core->database;
    $this->mailer = new Mailer($_ENV['MAIL_HOST'], $_ENV['MAIL_USER'], $_ENV['MAIL_PASS'], (int)$_ENV['MAIL_PORT']);
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

    $email = trim($_POST['email'] ?? '');
    if (empty($email)) {
      $this->core->json(['notify' => ['message' => 'Введите ваш E-mail', 'type' => 'warning']]);
      return;
    }

    try {
      $stmt = $this->database->prepare('SELECT id, email FROM users WHERE email = :email');
      $stmt->execute(['email' => $email]);
      $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (\PDOException $e) {
      $this->core->json(['notify' => ['message' => 'Ошибка базы данных при поиске', 'type' => 'error']]);
      return;
    }

    if (!$userRow) {
      $this->core->json(['notify' => ['message' => 'Пользователь с таким E-mail не найден', 'type' => 'warning']]);
      return;
    }

    $token = bin2hex(random_bytes(32));

    $expiresAt = date('Y-m-d H:i:s', time() + 1800);

    try {
      $stmt = $this->database->prepare('
        INSERT INTO users_forgot (user_id, token_hash, expires_at) 
        VALUES (:user_id, :token_hash, :expires_at)
        ON DUPLICATE KEY UPDATE token_hash = :update_token_hash, expires_at = :update_expires_at
    ');

      $stmt->execute([
        'user_id'           => $userRow['id'],
        'token_hash'        => $token,
        'expires_at'        => $expiresAt,
        'update_token_hash' => $token,
        'update_expires_at' => $expiresAt
      ]);
    } catch (\PDOException $e) {
      $this->core->json(['notify' => ['message' => 'Ошибка базы данных: ' . $e->getMessage(), 'type' => 'error']]);
      return;
    }

    $resetLink = "https://" . $_SERVER['HTTP_HOST'] . "/auth/forgot?token=" . $token;

    $mailResult = $this->mailer->from('yuki@wisteriamc.ru', 'WisteriaMC * Yuki')
      ->to($userRow['email'])
      ->subject('Восстановление пароля')
      ->body($this->core->html(_Modules . '/Auth/Views/MailMessageForgot.phtml', [
        'resetLink' => $resetLink
      ]))
      ->send();

    if (!$mailResult) {
      $this->core->json(['notify' => ['message' => 'Не удалось отправить письмо. Попробуйте позже', 'type' => 'error']]);
      return;
    }

    $this->updateLastIp($userRow['id']);

    $this->core->json([
      'notify' => ['message' => 'Инструкция по восстановлению отправлена на ваш Email', 'type' => 'success']
    ]);
  }

  /**
   * Обновляет IP-адрес последнего визита пользователя.
   * @param int $userId
   * @return void
   */
  private function updateLastIp(int $userId): void {
    try {
      $pUpdate = $this->database->prepare('UPDATE users SET ipLast = :ipLast WHERE id = :id');
      $pUpdate->execute(['ipLast' => Core::ip(), 'id' => $userId]);
    } catch (\PDOException $e) {
      error_log("Failed to update last IP for user {$userId}: " . $e->getMessage());
    }
  }
}
