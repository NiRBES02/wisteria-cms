<?php

namespace App\Modules\Profile\Controllers;

class PersonController extends ProfileController {

  private function getAllSkins() {
    $skins = [];
    $directory = _Uploads . "/users/{$this->core->auth->getUser()->login}/skins";

    if (!is_dir($directory)) {
      return $skins;
    }

    $pngFiles = glob($directory . '/*.[pP][nN][gG]');

    if (empty($pngFiles)) {
      return $skins;
    }

    $filesWithTime = [];
    foreach ($pngFiles as $file) {
      $filesWithTime[] = [
        'file' => $file,
        'mtime' => filemtime($file)
      ];
    }

    usort($filesWithTime, function ($a, $b) {
      return $b['mtime'] <=> $a['mtime'];
    });

    foreach ($filesWithTime as $fileInfo) {
      $file = $fileInfo['file'];

      $filename = pathinfo($file, PATHINFO_FILENAME);

      if (substr($filename, -5) === '_mini') {
        $filename = substr($filename, 0, -5);
      }
      if (!in_array($filename, $skins)) {
        $skins[] = $filename;
      }
    }

    return $skins;
  }

  public function load() {
    $this->core->layoutManager->setContent([
      'content' => $this->core->html(_Modules . '/Profile/Views/Person.phtml', ['skins' => $this->getAllSkins()])
    ]);

    $this->core->layoutManager->setContentScripts([
      '/application/Modules/Profile/Public/Js/SkinView.js',
      '/application/Modules/Profile/Public/Js/SkinUpload.js'
    ]);

    return $this->core->layoutManager->render();
  }
}
