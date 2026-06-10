<?php

namespace App\Modules\Auth\Models;

use App\Classes\Core;

if (!defined('devsakura')) exit('denied');

class LoginModel {
  protected Core $core;

  public function __construct(Core $core) {
    $this->core = $core;
  }

  public function load(): void {
    $this->core->json([
      'notify' => ['message' => 'Вы успешно авторизовались!', 'type' => 'success']
    ]);
  }
}
