<?php

namespace App\Modules\Profile\Controllers;

use App\Classes\Core;

abstract class ProfileController {
  protected Core $core;

  public function __construct(Core $core) {
    $this->core = $core;

    $this->core->layoutManager->reset();
    $this->core->layoutManager->setLayout('LayoutProfile');

    $this->core->layoutManager->addNavbar('nav-top', $this->core->html(_Modules . '/Profile/Views/nav-top.phtml'));
    $this->core->layoutManager->addNavbar('nav-left', $this->core->html(_Modules . '/Profile/Views/nav-left.phtml'));
  }

  abstract public function load();
}
