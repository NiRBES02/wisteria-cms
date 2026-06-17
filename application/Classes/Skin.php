<?php

namespace App\Classes;

if (!defined('devsakura')) exit('denied');

class Skin {
  private int $mp = 64;
  private Core $core;

  public function __construct(Core $core) {
    $this->core = $core;
  }

  public function upload(array $file_obj): void {
    if (!$this->core->auth->isAuth()) {
      $this->error('Действие доступно только авторизованным пользователям');
      return;
    }

    $upload_dir = _Uploads . "/users/{$this->core->auth->getUser()->login}/skins";

    if (!is_dir($upload_dir)) {
      mkdir($upload_dir, 0755, true);
    }

    if (!is_writable($upload_dir)) {
      $this->error('Отсутствуют права на запись в директорию пользователя');
      return;
    }

    if ($file_obj['error'] !== UPLOAD_ERR_OK) {
      $this->error('Ошибка загрузки файла: код ' . $file_obj['error']);
      return;
    }

    $tmp = $file_obj['tmp_name'];

    $img_info = @getimagesize($tmp);
    if (!$img_info || $img_info[2] !== IMAGETYPE_PNG) {
      $this->error('Разрешено загружать только исправные PNG изображения');
      return;
    }

    if (!$this->isSkinValid($img_info)) {
      $this->error('Неверный формат или размер скина (поддерживаются 64x32, 64x64 и HD-множители)');
      return;
    }

    $hash = md5_file($tmp);
    $target_file = $upload_dir . "/{$hash}.png";

    if (move_uploaded_file($tmp, $target_file)) {
      $this->createHead($target_file, $img_info[0] / $this->mp, 151, $hash);
      $stmt = $this->core->database->prepare("UPDATE users SET skin = ? WHERE id = ?");
      $stmt->execute([$hash, $this->core->auth->getUser()->id]);

      $this->core->json(['notify' => ['message' => 'Скин успешно обновлен!', 'type' => 'success']]);
      return;
    }

    $this->error('Не удалось сохранить файл');
    return;
  }

  private function error(string $msg): void {
    $this->core->json(['notify' => ['message' => $msg, 'type' => 'error']]);
    return;
  }

  public function isSkinValid(array $size): bool {
    $w = $size[0];
    $h = $size[1];

    if ($w < 64 || ($h != 32 && $h != 64)) {
      if ($w % 64 !== 0) return false;
    }

    $ratio = $w / $h;
    return ($ratio == 2 || $ratio == 1);
  }

  private function createCanvas(int $w, int $h) {
    $canvas = imagecreatetruecolor($w, $h);
    imagealphablending($canvas, false);
    $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
    imagefill($canvas, 0, 0, $transparent);
    imagesavealpha($canvas, true);
    return $canvas;
  }

  public function createHead(string $path, float|int $multiple, int $size = 151, string $hash = 'head'): bool {
    $src = imagecreatefrompng($path);
    if (!$src) return false;

    $new = $this->createCanvas($size, $size);
    imagealphablending($new, true);

    imagecopyresampled($new, $src, 0, 0, 8 * $multiple, 8 * $multiple, $size, $size, 8 * $multiple, 8 * $multiple);
    imagecopyresampled($new, $src, 0, 0, 40 * $multiple, 8 * $multiple, $size, $size, 8 * $multiple, 8 * $multiple);

    $output_dir = _Uploads . "/users/{$this->core->auth->getUser()->login}/heads";
    if (!is_dir($output_dir)) {
      mkdir($output_dir, 0755, true);
    }

    $res = imagepng($new, $output_dir . "/{$hash}_head.png");

    return $res;
  }
}
