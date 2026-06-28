<?php

namespace App\Modules\Auth\Controllers;

use PDO;

class ForgotController extends AuthController {

  public function load() {
    if ($this->core->auth->isAuth()) {
      $this->core->json(['notify' => ['message' => 'Вы уже авторизованы', 'type' => 'warning']]);
      return;
    }

    $token = trim($_GET['token'] ?? '');

    if (empty($token)) {
      $this->core->layoutManager->setContentScripts(['/application/Modules/Auth/Public/Js/ForgotSend.js']);
      $this->core->layoutManager->setContent([
        'content' => $this->core->html(_Modules . '/Auth/Views/Forgot.phtml')
      ]);

      return $this->core->layoutManager->render();
    }

    try {
      // $stmt = $this->core->database->prepare('
      //   SELECT user_id 
      //   FROM users_forgot 
      //   WHERE token_hash = :token_hash AND expires_at > NOW()
      //   LIMIT 1
      // ');

      // NiRBES: Временно убрал проверку по времени
      $stmt = $this->core->database->prepare('
        SELECT user_id 
        FROM users_forgot 
        WHERE token_hash = :token_hash
        LIMIT 1
      ');
      $stmt->execute(['token_hash' => $token]);
      $forgotRow = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (\PDOException $e) {
      $this->core->layoutManager->setContent([
        'content' => '<div style="color: #ef4444; padding: 2rem; text-align: center;">Ошибка базы данных при проверке токена.</div>'
      ]);
      return $this->core->layoutManager->render();
    }

    if (!$forgotRow) {
      $this->core->layoutManager->setContent([
        'content' => $this->core->html(_Modules . '/Auth/Views/ForgotError.phtml')
      ]);
      return $this->core->layoutManager->render();
    }

    $this->core->layoutManager->setContentScripts([
      '/application/Modules/Auth/Public/Js/ForgotReset.js',
      '/application/Modules/Auth/Public/Js/ShowPassword.js'
    ]);
    $this->core->layoutManager->setContent([
      'content' => $this->core->html(_Modules . '/Auth/Views/ForgotResetPassword.phtml', [
        'token' => $token
      ])
    ]);

    return $this->core->layoutManager->render();
  }
}
