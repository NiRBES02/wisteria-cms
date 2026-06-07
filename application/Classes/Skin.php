<?php

namespace App\Classes;

if (!defined('devsakura')) exit('denied');

class Skin {
  private int $mp = 64;
  private Core $core;
  private Database $db;
  private ?User $user;

  public function __construct(Core $core) {
    $this->core = $core;
    $this->db = $core->database;
    // Извлекаем текущего пользователя через сервис авторизации (Композиция)
    $this->user = $core->auth->getUser();
  }

  /**
   * Основной метод обработки загрузки скина
   */
  public function upload(array $file_obj): string {
    if (!$this->user) {
      return $this->error('Действие доступно только авторизованным пользователям');
    }

    $upload_dir = _Uploads_Users . "/{$this->user->login}/skins";

    if (!is_dir($upload_dir)) {
      mkdir($upload_dir, 0755, true);
    }

    if (!is_writable($upload_dir)) {
      return $this->error('Отсутствуют права на запись в директорию пользователя');
    }

    if ($file_obj['error'] !== UPLOAD_ERR_OK) {
      return $this->error('Ошибка загрузки файла: код ' . $file_obj['error']);
    }

    $tmp = $file_obj['tmp_name'];

    $img_info = @getimagesize($tmp);
    if (!$img_info || $img_info[2] !== IMAGETYPE_PNG) {
      return $this->error('Разрешено загружать только исправные PNG изображения');
    }

    if (!$this->is_skin_valid($img_info)) {
      return $this->error('Неверный формат или размер скина (поддерживаются 64x32, 64x64 и HD-множители)');
    }

    // Сохраняем файл скина
    $target_file = $upload_dir . '/skin.png';
    if (move_uploaded_file($tmp, $target_file)) {

      // Генерируем аватарку (голову) 151x151 на основе загруженного скина
      $this->create_head($target_file, $img_info[0] / $this->mp, 151);

      // Обновляем данные в БД через композицию
      $stmt = $this->db->pdo->prepare("UPDATE users SET skin = 1 WHERE id = ?");
      $stmt->execute([$this->user->id]);

      return $this->core->json([
        'notify' => [
          'message' => 'Скин успешно обновлен!',
          'type' => 'success'
        ]
      ]);
    }

    return $this->error('Не удалось сохранить файл');
  }

  private function error(string $msg): string {
    return $this->core->json([
      'notify' => ['message' => $msg, 'type' => 'error']
    ]);
  }

  public function is_skin_valid(array $size): bool {
    $w = $size[0];
    $h = $size[1];

    if ($w < 64 || ($h != 32 && $h != 64)) {
      if ($w % 64 !== 0) return false;
    }

    $ratio = $w / $h;
    return ($ratio == 2 || $ratio == 1);
  }

  private function create_canvas(int $w, int $h) {
    $canvas = imagecreatetruecolor($w, $h);
    imagealphablending($canvas, false);
    $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
    imagefill($canvas, 0, 0, $transparent);
    imagesavealpha($canvas, true);
    return $canvas;
  }

  public function create_head(string $path, float|int $multiple, int $size = 151): bool {
    $src = imagecreatefrompng($path);
    if (!$src) return false;

    $new = $this->create_canvas($size, $size);
    imagealphablending($new, true);

    // Копируем базовый слой головы
    imagecopyresampled($new, $src, 0, 0, 8 * $multiple, 8 * $multiple, $size, $size, 8 * $multiple, 8 * $multiple);
    // Накладываем слой шлема/аксессуаров головы
    imagecopyresampled($new, $src, 0, 0, 40 * $multiple, 8 * $multiple, $size, $size, 8 * $multiple, 8 * $multiple);

    $output_dir = _Uploads_Users . "/{$this->user->login}/heads";
    if (!is_dir($output_dir)) {
      mkdir($output_dir, 0755, true);
    }

    $res = imagepng($new, $output_dir . '/head.png');

    imagedestroy($src);
    imagedestroy($new);

    return $res;
  }
}
