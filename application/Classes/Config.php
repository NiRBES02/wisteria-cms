<?php

namespace App\Classes;

if (!defined('devsakura')) exit('denied');

class Config {

  public array $assets;
  protected Core $core;

  public function __construct(Core $core) {
    $this->core = $core;
    $this->assets   = $this->loadConfigFile(_Configs . '/assets.php');
  }

  /**
   * Безопасная загрузка конфигурационного файла
   * * @param string $path Полный путь к файлу конфигурации
   * @return array Возвращает массив настроек или пустой массив в случае отсутствия файла
   */
  private function loadConfigFile(string $path): array {
    if (file_exists($path)) {
      $configData = require $path;
      return is_array($configData) ? $configData : [];
    }
    return [];
  }
}
