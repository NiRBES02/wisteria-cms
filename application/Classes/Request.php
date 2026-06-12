<?php

namespace App\Classes;

class Request {
  public static function isGet(): bool {
    return ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET';
  }

  public static function isPost(): bool {
    return ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
  }

  public static function isAjax(): bool {
    return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) &&
      strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
  }

  public static function method(): string {
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
  }

  public static function uri(): string {
    return parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
  }
}
