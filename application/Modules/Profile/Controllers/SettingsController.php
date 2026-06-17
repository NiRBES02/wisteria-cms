<?php

namespace App\Modules\Profile\Controllers;

class SettingsController extends ProfileController {
  public function load() {
    // if (!$this->core->auth->isAuth()) {
    //   return $this->core->json(['notify' => ['message' => 'Доступ запрещен', 'type' => 'error']]);
    // }

    $this->core->layoutManager->setContent([
      'content' => $this->core->html(_Modules . '/Profile/Views/settings.phtml')
    ]);

    return $this->core->layoutManager->render();
  }
}
