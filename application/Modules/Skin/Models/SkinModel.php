<?php

namespace App\Modules\Skin\Models;

use App\Classes\Core;

abstract class SkinModel {
  protected Core $core;

  public function __construct(Core $core) {
    $this->core = $core;
  }

  abstract public function load(): void;
}
