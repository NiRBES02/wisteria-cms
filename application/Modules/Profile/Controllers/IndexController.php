<?php

namespace App\Modules\Profile\Controllers;

class IndexController extends ProfileController {

  public function load() {
    $targetUser = $this->core->router->getParam(0);

    if ($targetUser !== null) {
      $stmt = $this->core->database->prepare("SELECT * FROM users WHERE id = ? OR login = ?");
      $stmt->execute([$targetUser, $targetUser]);
      $userData = $stmt->fetch();
    } else {
      if (!$this->core->auth->isAuth()) {
        return $this->core->json(['notify' => ['message' => 'Авторизуйтесь', 'type' => 'error']]);
      }
      $userData = $this->core->auth->getUser();
    }

    $this->core->layoutManager->setContent([
      'content' => $this->core->html(_Modules . '/Profile/Views/profile.phtml', ['target' => $targetUser])
    ]);

    $this->core->layoutManager->setContentScripts(['/application/Modules/Profile/Public/Js/Advanced.js']);

    return $this->core->layoutManager->render();
  }
}
