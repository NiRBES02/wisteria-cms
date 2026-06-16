<?php

namespace App\Modules\Auth\Models;

use App\Classes\Core;
use App\Classes\Request;
use PDO;
use Exception;

if (!defined('devsakura')) exit('denied');

class LogoutModel {
  protected Core $core;

  public function __construct(Core $core) {
    $this->core = $core;
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

    $this->core->auth->logout();

    $this->core->json(['notify' => ['message' => 'Мы будем ждать вас снова!', 'type' => 'success']]);
  }
}
