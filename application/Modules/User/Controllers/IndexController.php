<?php

namespace App\Modules\User\Controllers;

// use App\Modules\User\UserController;

class IndexController extends UserController {

  public function load() {
    $targetUser = $this->core->router->getParam(0);

    if ($targetUser !== null) {
      $stmt = $this->core->database->pdo->prepare("SELECT * FROM users WHERE id = ? OR login = ?");
      $stmt->execute([$targetUser, $targetUser]);
      $userData = $stmt->fetch();
    } else {
      if (!$this->core->auth->isAuth()) {
        return $this->core->json(['notify' => ['message' => 'Авторизуйтесь', 'type' => 'error']]);
      }
      $userData = $this->core->auth->getUser();
    }

    $this->core->layoutManager->setContent([
      'content' => $this->core->html(_Modules . '/User/Views/profile.phtml', ['target' => $targetUser])
    ]);

    return $this->core->layoutManager->render();
  }
}
