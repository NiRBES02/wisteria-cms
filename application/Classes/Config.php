<?php

namespace App\Classes;

if (!defined('devsakura')) exit('Denied');

class Config {
  public array $database;
  public array $assets;
  public array $main;
  public array $mail;

  // Свойство для хранения ссылки на ядро, если она понадобится внутри конфигов
  protected Core $core;

  public function __construct(Core $core) {
    $this->core = $core;

    // Загружаем массивы конфигурации из файлов
    // Используем константу _App_Configs, которая должна быть определена в init.php
    $this->database = $this->loadConfigFile(_Configs . '/database.php');
    $this->assets   = $this->loadConfigFile(_Configs . '/assets.php');
    $this->main     = $this->loadConfigFile(_Configs . '/main.php');
    $this->mail     = $this->loadConfigFile(_Configs . '/mail.php');
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
