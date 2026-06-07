<?php

namespace App\Modules\Main\Controllers;

use App\Classes\Core;

abstract class MainController {
  protected Core $core;

  public function __construct(Core $core) {
    $this->core = $core;
    $this->core->layoutManager->reset();
    $this->core->layoutManager->setLayout('main');

    $this->core->layoutManager->addNavbar('navbar', $this->core->html(_Modules . '/Main/Views/Navbar.phtml'));
  }

  abstract public function load();
}
