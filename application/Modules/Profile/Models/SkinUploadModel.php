<?php

namespace App\Modules\Profile\Models;

use App\Classes\Core;
use App\Classes\Skin;

class SkinUploadModel {
  private Core $core;

  public function __construct(Core $core) {
    $this->core = $core;
  }

  public function load() {
    $file = $_FILES['image'];

    $skin = new Skin($this->core);

    $skin->upload($file);


    return $this->core->json([
      'notify' => [
        'message' => 'Вы успешно загрузили скин',
        'type' => 'success'
      ]
    ]);
  }
}
