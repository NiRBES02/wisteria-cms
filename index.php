<?php

use App\Classes\Request;

error_reporting(E_ALL);
ini_set('display_errors', 1);

define('devsakura', true);

require_once('./init.php');

try {
  $core = new App\Classes\Core();

  $currentUri = App\Classes\Request::uri();

  if (Request::isAjax() || str_contains($currentUri, '/skin/') || str_contains($currentUri, '/api/')) {
    $core->handleRequest();
  }

  echo $core->html(_Layouts . '/index.phtml', ['core' => $core]);
} catch (\Throwable $e) {
  header('Content-Type: application/json');
  echo json_encode([
    'notify' => [
      'message' => 'Критическая ошибка сервера: ' . $e->getMessage(),
      'type' => 'error'
    ]
  ], JSON_UNESCAPED_UNICODE);
  error_log($e);
}
