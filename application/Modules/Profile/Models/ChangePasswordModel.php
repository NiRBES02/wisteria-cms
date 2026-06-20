<?php

namespace App\Modules\Profile\Models;

use App\Classes\Core;
use App\Classes\Request;
use PDO;
use Exception;

if (!defined('devsakura')) exit('denied');

class ChangePasswordModel {
  protected Core $core;
  protected PDO $database;

  private string $oldPassword = '';
  private string $newPassword = '';

  public function __construct(Core $core) {
    $this->core = $core;
    $this->database = $core->database;
  }

  public function load(): void {
    if (!Request::isAjax() || !Request::isPost()) {
      $this->core->json(['notify' => ['message' => 'Метод не поддерживается', 'type' => 'error']]);
      return;
    }

    if (!$this->core->auth->isAuth()) {
      $this->core->json(['notify' => ['message' => 'Вы не авторизованы', 'type' => 'warning']]);
      return;
    }

    $this->oldPassword = isset($_POST['oldPassword']) ? (string) $_POST['oldPassword'] : '';
    $this->newPassword = isset($_POST['newPassword']) ? (string) $_POST['newPassword'] : '';

    if (empty($this->oldPassword) || empty($this->newPassword)) {
      $this->core->json(['notify' => ['message' => 'Старый или новый пароль не указан', 'type' => 'warning']]);
      return;
    }

    if (!$this->core->auth->checkPassword($this->oldPassword, $this->core->auth->getUser()->password)) {
      $this->core->json(['notify' => ['message' => 'Старый пароль не совпадает', 'type' => 'warning']]);
      return;
    }

    if (mb_strlen($this->newPassword, 'UTF-8') < 6) {
      $this->core->json(['notify' => ['message' => 'Новый пароль должен быть длиной не менее 6-ти символов', 'type' => 'warning']]);
      return;
    }

    if (!$this->core->auth->changePassword($this->core->auth->getUser()->id, $this->newPassword)) {
      $this->core->json(['notify' => ['message' => 'Не удалось поменять пароль', 'type' => 'error']]);
    }

    $this->core->json(['notify' => ['message' => 'Вы успешно сменили пароль', 'type' => 'success']]);
  }
}
