<?php

namespace App\Modules\Auth\Controllers;

class RegisterController extends AuthController {

  public function load() {
    if ($this->core->auth->isAuth()) {
      $this->core->json(['notify' => ['message' => 'Вы уже авторизованы', 'type' => 'warning']]);
      return;
    }

    $this->core->layoutManager->setContentScripts([
      '/application/Modules/Auth/Public/Js/Register.js',
      '/application/Modules/Auth/Public/Js/ShowPassword.js'
    ]);
    $this->core->layoutManager->setContent([
      'content' => $this->core->html(_Modules . '/Auth/Views/Register.phtml')
    ]);

    return $this->core->layoutManager->render();
  }
}
