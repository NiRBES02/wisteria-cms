<?php

namespace App\Modules\User\Controllers;

use App\Classes\Core;

abstract class UserController {
  protected Core $core;

  public function __construct(Core $core) {
    $this->core = $core;
    $this->core->layoutManager->reset();
    $this->core->layoutManager->setLayout('profile');

    // Общие элементы навигации для всего модуля User
    $this->core->layoutManager->addNavbar(
      'nav-top',
      $this->core->html(_App_Modules . '/User/Views/nav-top.phtml')
    );
  }

  abstract public function load();
}
