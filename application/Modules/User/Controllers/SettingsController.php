<?php

namespace App\Modules\User\Controllers;

class SettingsController extends UserController
{
  public function load()
  {
    if (!$this->core->auth->isAuth()) {
      return $this->core->json(['notify' => ['message' => 'Доступ запрещен', 'type' => 'error']]);
    }

    $this->core->layoutManager->setContent([
      'content' => $this->core->html(_App_Modules . '/User/views/settings_form.phtml')
    ]);

    return $this->core->layoutManager->render();
  }
}
