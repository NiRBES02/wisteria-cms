<?php

namespace App\Modules\Auth\Controllers;

use App\Classes\Core;

abstract class AuthController {
  protected Core $core;

  public function __construct(Core $core) {
    $this->core = $core;

    $this->core = $core;

    $this->core->layoutManager->reset();
    $this->core->layoutManager->setLayout('main');
  }

  abstract public function load();
}
