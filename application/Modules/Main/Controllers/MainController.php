<?php

namespace App\Modules\Main\Controllers;

use App\Classes\Core;

abstract class MainController {
  protected Core $core;

  public function __construct(Core $core) {
    $this->core = $core;

    $this->core->layoutManager->reset();
    $this->core->layoutManager->setLayout('main');
  }

  abstract public function load();
}
