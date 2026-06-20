<?php

namespace App\Modules\Auth\Controllers;

class ForgotController extends AuthController {

  public function load() {
    if ($this->core->auth->isAuth()) {
      $this->core->json(['notify' => ['message' => 'Вы уже авторизованы', 'type' => 'warning']]);
      return;
    }

    // $this->core->layoutManager->setContentScripts(['/application/Modules/Auth/public/js/Login.js']);
    $this->core->layoutManager->setContent([
      'content' => $this->core->html(_Modules . '/Auth/Views/Forgot.phtml')
    ]);

    return $this->core->layoutManager->render();
  }
}
