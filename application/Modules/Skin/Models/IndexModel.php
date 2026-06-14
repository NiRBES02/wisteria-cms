<?php

namespace App\Modules\Skin\Models;

use App\Classes\Request;
use App\Classes\User;
use PDO;

if (!defined('devsakura')) exit('denied');

class IndexModel extends SkinModel {

  public function load(): void {

    $requestUser = isset($_REQUEST['user']) ? trim((string) $_REQUEST['user']) : null;
    $hash = isset($_REQUEST['hash']) ? trim((string) $_REQUEST['hash']) : null;
    $isMini = isset($_REQUEST['mode']);
    $suffix = $isMini ? '_mini' : '';

    while (ob_get_level() > 0) {
      ob_end_clean();
    }

    $targetUser = null;

    if (!empty($requestUser)) {
      $targetUser = $this->getUserByLogin($requestUser);
    } else {
      $targetUser = $this->core->auth->getUser();
    }

    if ($hash) {
      $path = $this->findSkinByHash($hash, $suffix);
    } elseif ($targetUser && isset($targetUser->login, $targetUser->skin)) {
      $login = $targetUser->login;
      $userHash = $targetUser->skin;
      $path = _Uploads . "/users/{$login}/skins/{$userHash}{$suffix}.png";
    } else {
      $path = _Uploads . "/default/skins/default{$suffix}.png";
    }

    if (!file_exists($path)) {
      $path = _Uploads . "/default/skins/default{$suffix}.png";
      if (!file_exists($path)) {
        http_response_code(404);
        exit('Skin not found');
      }
    }

    // --- ОЧИСТКА БУФЕРА ВЫВОДА PHP ---
    if (ini_get('zlib.output_compression')) {
      @ini_set('zlib.output_compression', 'Off');
    }

    // Закрываем и стираем все буферы, включая ob_start() из Core.php
    while (ob_get_level() > 0) {
      ob_end_clean();
    }

    // Отправляем абсолютно чистые бинарные заголовки
    header('Content-Type: image/png');
    header('Content-Length: ' . filesize($path));
    header('Access-Control-Allow-Origin: *');
    header('Cache-Control: public, max-age=86400');
    header('Content-Transfer-Encoding: binary');

    flush();
    readfile($path);
    exit;
  }

  private function getUserByLogin(string $login): ?User {
    if (!$this->core->database) {
      return null;
    }

    try {
      $stmt = $this->core->database->prepare("SELECT * FROM users WHERE login = ? LIMIT 1");
      $stmt->execute([$login]);
      $userData = $stmt->fetch(PDO::FETCH_ASSOC);

      if ($userData) {
        return new User($userData);
      }
    } catch (\PDOException $e) {
      error_log("SkinController user load error: " . $e->getMessage());
    }

    return null;
  }

  private function findSkinByHash(string $hash, string $suffix): string {
    $pathsToCheck = [
      _Uploads . "/users/*/skins/{$hash}{$suffix}.png",
      _Uploads . "/users/skins/{$hash}{$suffix}.png",
      _Uploads . "/skins/{$hash}{$suffix}.png"
    ];

    foreach ($pathsToCheck as $pattern) {
      $files = glob($pattern);
      if (!empty($files)) {
        return $files[0];
      }
    }

    return _Uploads . "/default/skins/default{$suffix}.png";
  }
}
