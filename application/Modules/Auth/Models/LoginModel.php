<?php

namespace App\Modules\Auth\Models;

use App\Classes\Core;
use App\Classes\Request;
use App\Classes\Mailer;
use PDO;

if (!defined('devsakura')) exit('denied');

class LoginModel {
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

    $login = trim($_POST['login'] ?? '');
    $password = $_POST['password'] ?? '';
    $remember = isset($_POST['remember']);
    $client = json_decode($_POST['client'], true);

    // $this->core->json(['notify' => ['message' => $client['browser'], 'type' => 'json']]);

    if (empty($login) || empty($password)) {
      $this->core->json(['notify' => ['message' => 'Заполните все поля', 'type' => 'warning']]);
      return;
    }

    try {
      $stmt = $this->database->prepare('SELECT login, email FROM users WHERE login = :login OR email = :email LIMIT 1');
      $stmt->execute(['login' => $login, 'email' => $login]);
      $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (\PDOException $e) {
      $this->core->json([
        'notify' => ['message' => 'Ошибка базы данных при поиске', 'type' => 'error']
      ]);
      return;
    }

    if (!$userRow) {
      $this->core->json(['notify' => ['message' => 'Пользователь с таким Логином или E-mail не найден', 'type' => 'warning']]);
      return;
    }

    $loginResult = $this->core->auth->login($userRow['login'], $password, $remember);
    if ($loginResult) {
      $this->mailer->from('yuki@wisteriamc.ru', 'Yuki')->to($userRow['email'])->subject('Выполнен вход')->body($this->core->html(_Modules . '/Auth/Views/MailMessageLogin.phtml', [
        'browser' => $client['browser'],
        'ip' => Core::ip(),
        'date' => Core::formatDate()
      ]))->send();
      $this->updateLastIp($this->core->auth->getUser()->id);

      $this->core->json(['notify' => ['message' => 'Вы успешно авторизовались!', 'type' => 'success']]);
    } else {
      $this->core->json(['notify' => ['message' => 'Неверный пароль', 'type' => 'error']]);
    }
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
