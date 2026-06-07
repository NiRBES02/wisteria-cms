<?php

namespace App\Modules\Main\Controllers;

class IndexController extends MainController {


  private function getUserCount() {
    return $this->core->database->query('SELECT COUNT(*) FROM `users`')->fetchColumn();
  }

  public function load() {
    $this->core->layoutManager->setContent([
      'content' => $this->core->html(_Modules . '/Main/Views/Main.phtml', ['usersCount' => $this->getUserCount()])
    ]);

    return $this->core->layoutManager->render();
  }
}
