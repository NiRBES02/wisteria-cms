<?php

namespace App\Modules\Auth\Models;

use App\Classes\Core;
use App\Classes\AuthService;
use PDO;

if (!defined('devsakura')) exit('denied');

class LoginModel {
  protected Core $core;
  protected PDO $database;

  public function __construct(Core $core) {
    $this->core = $core;
    $this->database = $core->database;
  }

  public function load(): void {
    if ($this->core->auth->isAuth()) {
      $this->core->json([
        'notify' => [
          'message' => 'Вы уже авторизованы',
          'type' => 'warning'
        ]
      ]);
      return;
    }

    $login = $_POST['login'] ?? '';
    $password = $_POST['password'] ?? '';

    try {
      $pSelect = $this->database->prepare('
        SELECT id, password, tmp FROM users
        WHERE login = :login OR email = :email LIMIT 1
      ');

      $pSelect->execute([
        'login' => $login,
        'email' => $login
      ]);

      $arg = $pSelect->fetch();
    } catch (\PDOException $e) {
      $this->core->json([
        'notify' => ['message' => 'sql e 1', 'type' => 'error']
      ]);
      return;
    }

    if (!$arg) {
      $this->core->json([
        'notify' => [
          'message' => 'Пользователь с таким Логином или E-mail не найден',
          'type' => 'warning'
        ]
      ]);
      return;
    }

    if (!$this->core->auth->checkPassword($password, $arg['password'])) {
      $this->core->json([
        'notify' => [
          'message' => 'Неверный пароль',
          'type' => 'error'
        ]
      ]);
      return;
    }

    $uid = (int)$arg['id'];
    $new_tmp = AuthService::createTmp();
    $new_ip = Core::ip();

    try {
      $pUpdate = $this->database->prepare('
        UPDATE users
        SET tmp = :tmp, ipLast = :ipLast
        WHERE id = :id
      ');

      $pUpdate->execute([
        'tmp' => $new_tmp,
        'ipLast' => $new_ip,
        'id' => $uid
      ]);
    } catch (\PDOException $e) {
      $this->core->json([
        'notify' => ['message' => 'sql e 2', 'type' => 'error']
      ]);
      return;
    }

    $sessionHash = $uid . $new_tmp . $new_ip . md5($this->core->config->main['site_secury']);
    $sessionHash = $uid . '_' . md5($sessionHash);
    $safetime = 3600 * 24 * 30 + time();
    $sessionHash2 = explode('_', $sessionHash);

    try {
      $pInsert = $this->database->prepare('
        INSERT INTO sessions (uid, hash, ipCreate, ipLast)
        VALUES (:uid, :hash, :ipCreate, :ipLast)
      ');

      $pInsert->execute([
        'uid' => $uid,
        'hash' => $sessionHash2[1],
        'ipCreate' => $new_ip,
        'ipLast' => $new_ip
      ]);
    } catch (\PDOException $e) {
      $this->core->json([
        'notify' => ['message' => 'sql e 3', 'type' => 'error']
      ]);
      return;
    }

    setcookie('ds_userId', $sessionHash2[0], $safetime, '/');
    setcookie('ds_UserHash', $sessionHash2[1], $safetime, '/');

    $this->core->json([
      'notify' => ['message' => 'Вы успешно авторизовались!', 'type' => 'success']
    ]);
  }
}
