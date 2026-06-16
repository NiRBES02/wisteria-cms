<?php

namespace App\Modules\Auth\Models;

use App\Classes\Core;
use App\Classes\Request;
use PDO;
use Exception;

if (!defined('devsakura')) exit('denied');

class RegisterModel {
  protected Core $core;
  protected PDO $database;

  private string $login = '';
  private string $email = '';
  private string $password = '';
  private string $uuid = '';

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

    $this->login = trim($_POST['login'] ?? '');
    $this->email = mb_strtolower(trim($_POST['email'] ?? ''), 'UTF-8');
    $this->password = $_POST['password'] ?? '';

    if (mb_strlen($this->login, 'UTF-8') < 4 || mb_strlen($this->login, 'UTF-8') > 16) {
      $this->core->json(['notify' => ['message' => 'Логин должен быть длиной не менее 4-х и не более 16-ти символов', 'type' => 'warning']]);
      return;
    }

    if (!preg_match('/^[a-zA-Z0-9]*$/', $this->login)) {
      $this->core->json(['notify' => ['message' => 'Логин может состоять только из латинских букв и цифр', 'type' => 'warning']]);
      return;
    }

    $rejectLogins = [];
    if (defined('_Modules') && file_exists(_Modules . '/Auth/Models/RejectLogin.php')) {
      $rejectLogins = include _Modules . '/Auth/Models/RejectLogin.php';
      if (!is_array($rejectLogins)) {
        $rejectLogins = [];
      }
    }

    if (in_array(mb_strtolower($this->login, 'UTF-8'), array_map('mb_strtolower', $rejectLogins), true)) {
      $this->core->json(['notify' => ['message' => 'Запрещено использовать данный логин на проекте<br>См. <a href="https://github.com/NiRBES02/wisteria-cms/blob/main/app/modules/auth/models/reject_login.php" target="_blank" class="text-zinc-200 hover:text-purple-400 font-medium inline-flex items-center hover:underline hover:underline-offset-4">GitHub:reject_login<span class="text-zinc-400 text-2xs"><i class="fa-solid fa-arrow-up-right"></i></span></a>', 'type' => 'warning']]);
      return;
    }

    if (!filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
      $this->core->json(['notify' => ['message' => 'Неверный формат E-Mail адреса', 'type' => 'warning']]);
      return;
    }

    if (mb_strlen($this->password, 'UTF-8') < 6) {
      $this->core->json(['notify' => ['message' => 'Пароль должен быть длиной не менее 6-ти символов', 'type' => 'warning']]);
      return;
    }

    try {
      $stmt = $this->database->prepare('SELECT id FROM users WHERE LOWER(login) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1');
      $stmt->execute([$this->login, $this->email]);
      if ($stmt->fetch()) {
        $this->core->json(['notify' => ['message' => 'Логин или E-Mail уже заняты', 'type' => 'warning']]);
        return;
      }
    } catch (\PDOException $e) {
      $this->core->json(['notify' => ['message' => 'Ошибка базы данных при проверке уникальности', 'type' => 'error']]);
      return;
    }


    $this->uuid = Core::login2uuid($this->login);


    try {
      $this->database->beginTransaction();

      if (!$this->createUser()) {
        $this->database->rollBack();
        $this->core->json(['notify' => ['message' => 'Не удалось создать аккаунт', 'type' => 'error']]);
        return;
      }

      if (!$this->createLp()) {
        $this->database->rollBack();
        $this->core->json(['notify' => ['message' => 'Не удалось создать права', 'type' => 'error']]);
        return;
      }

      $this->database->commit();
    } catch (Exception $e) {
      if ($this->database->inTransaction()) {
        $this->database->rollBack();
      }
      $this->core->json(['notify' => ['message' => 'Внутренняя ошибка при регистрации', 'type' => 'error']]);
      return;
    }

    $this->core->json(['notify' => ['message' => 'Вы успешно зарегистрировались', 'type' => 'success']]);
  }

  private function createUser(): bool {
    $passwordHash = $this->core->auth->genPassword($this->password);
    $tmpToken = $this->core->auth::createTmp();
    $ip = Core::ip();
    $salt = Core::random();

    $stmt = $this->database->prepare('
      INSERT INTO users 
      (login, email, password, uuid, salt, tmp, ipCreate, ipLast) 
      VALUES (:login, :email, :password, :uuid, :salt, :tmp, :ipCreate, :ipLast)
    ');

    return $stmt->execute([
      'login'    => $this->login,
      'email'    => $this->email,
      'password' => $passwordHash,
      'uuid'     => $this->uuid,
      'salt'     => $salt,
      'tmp'      => $tmpToken,
      'ipCreate' => $ip,
      'ipLast'   => $ip
    ]);
  }

  private function createLp(): bool {
    $stmt = $this->database->prepare('
      INSERT INTO lp_players 
      (uuid, username, primary_group) 
      VALUES (:uuid, :login, :group)
    ');

    return $stmt->execute([
      'uuid'  => $this->uuid,
      'login' => $this->login,
      'group' => 'player'
    ]);
  }
}
