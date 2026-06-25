<?php

namespace App\Modules\Auth\Controllers;

use App\Classes\Core;
use PDO;


abstract class AuthController {
  protected Core $core;
  protected PDO $database;

  public function __construct(Core $core) {
    $this->core = $core;
    $this->database = $core->database;

    $this->core->layoutManager->reset();
    $this->core->layoutManager->setLayout('main');
  }

  abstract public function load();
}
