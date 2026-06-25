<?php

namespace App\Modules\Auth\Controllers;

class IndexController extends AuthController {

  public function load() {
    if ($this->core->auth->isAuth()) {
      $this->core->json(['notify' => ['message' => 'Вы уже авторизованы', 'type' => 'warning']]);
      return;
    }

    $this->core->layoutManager->setContentScripts(['/application/Modules/Auth/Public/js/Login.js']);
    $this->core->layoutManager->setContent([
      'content' => $this->core->html(_Modules . '/Auth/Views/Login.phtml')
    ]);

    return $this->core->layoutManager->render();
  }
}
