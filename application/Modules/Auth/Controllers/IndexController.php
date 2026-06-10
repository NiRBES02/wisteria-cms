<?php

namespace App\Modules\Auth\Controllers;

class IndexController extends AuthController {

  public function load() {
    $this->core->layoutManager->setContentScripts(['/application/Modules/Auth/public/js/Login.js']);
    $this->core->layoutManager->setContent([
      'content' => $this->core->html(_Modules . '/Auth/Views/Login.phtml')
    ]);


    return $this->core->layoutManager->render();
  }
}
