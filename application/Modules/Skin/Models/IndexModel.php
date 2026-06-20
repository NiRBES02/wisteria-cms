<?php

namespace App\Modules\Skin\Models;

use App\Classes\User;
use PDO;

if (!defined('devsakura')) exit('denied');

class IndexModel extends SkinModel {

  public function load(): void {

    $requestUser = isset($_REQUEST['user']) ? trim((string) $_REQUEST['user']) : null;
    $hash = isset($_REQUEST['hash']) ? trim((string) $_REQUEST['hash']) : null;

    $isHead = isset($_REQUEST['mode']);
    $suffix = $isHead ? '_head' : '';
    $folder = $isHead ? 'heads' : 'skins';

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
      $path = $this->findSkinByHash($hash, $suffix, $folder);
    } elseif ($targetUser && isset($targetUser->login, $targetUser->skin)) {
      $login = $targetUser->login;
      $userHash = $targetUser->skin;

      $path = _Uploads . "/users/{$login}/{$folder}/{$userHash}{$suffix}.png";
    } else {
      $path = $this->getDefaultPath($isHead);
    }

    if (!file_exists($path)) {
      $path = $this->getDefaultPath($isHead);
      if (!file_exists($path)) {
        http_response_code(404);
        exit('Skin not found');
      }
    }

    if (ini_get('zlib.output_compression')) {
      @ini_set('zlib.output_compression', 'Off');
    }

    while (ob_get_level() > 0) {
      ob_end_clean();
    }

    header('Content-Type: image/png');
    header('Content-Length: ' . filesize($path));
    header('Access-Control-Allow-Origin: *');
    header('Cache-Control: public, max-age=86400');
    header('Content-Transfer-Encoding: binary');

    flush();
    readfile($path);
    exit;
  }

  /**
   * Возвращает путь к дефолтным файлам из одной папки
   */
  private function getDefaultPath(bool $isHead): string {
    if ($isHead) {
      // /uploads/default/skins/default_mini.png
      return _Uploads . "/default/skins/default_mini.png";
    }
    // /uploads/default/skins/default.png
    return _Uploads . "/default/skins/default.png";
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

  private function findSkinByHash(string $hash, string $suffix, string $folder): string {
    $pathsToCheck = [
      _Uploads . "/users/*/{$folder}/{$hash}{$suffix}.png",
      _Uploads . "/{$folder}/{$hash}{$suffix}.png"
    ];

    foreach ($pathsToCheck as $pattern) {
      $files = glob($pattern);
      if (!empty($files)) {
        return $files[0];
      }
    }

    return $this->getDefaultPath(!empty($suffix));
  }
}
