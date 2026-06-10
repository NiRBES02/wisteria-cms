<?php

namespace App\Modules\Main\Controllers;

class Error404Controller extends MainController {
  public function load() {
    // /user/123 или /user/nickname
    $targetUser = $this->core->router->getParam(0);

    // if ($targetUser !== null) {
    //   $stmt = $this->core->database->pdo->prepare("SELECT * FROM users WHERE id = ? OR login = ?");
    //   $stmt->execute([$targetUser, $targetUser]);
    //   $userData = $stmt->fetch();
    // } else {
    //   // /user (свой профиль)
    //   if (!$this->core->auth->isAuth()) {
    //     return $this->core->json(['notify' => ['message' => 'Авторизуйтесь', 'type' => 'error']]);
    //   }
    //   $userData = $this->core->auth->getUser();
    // }

    $this->core->layoutManager->setContent([
      'content' => $this->core->html(_Modules . '/Main/Views/Main.phtml')
    ]);

    return $this->core->layoutManager->render();
  }
}
