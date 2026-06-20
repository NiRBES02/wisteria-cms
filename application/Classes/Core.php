<?php

namespace App\Classes;

if (!defined('devsakura')) exit('denied');

use PDO;

class Core {
  public Config $config;
  public ?PDO $database = null;
  public Router $router;
  public AuthService $auth;
  public LayoutManager $layoutManager;

  public function __construct() {
    ob_start();

    // set_error_handler([$this, 'handleError']);
    // set_exception_handler([$this, 'handleException']);
    // register_shutdown_function([$this, 'handleFatalError']);

    $this->config         = new Config($this);
    $this->database       = (new Database())->getConnection();
    $this->router         = new Router();
    $this->auth           = new AuthService($this);
    $this->layoutManager  = new LayoutManager($this);
  }

  public function handleRequest(): void {
    $module     = $this->router->getModule();
    $controller = $this->router->getController();
    $type       = $this->router->getTargetType();

    $this->layoutManager->reset();

    $subNamespace = $type === 'model' ? "Models\\" : "Controllers\\";
    $suffix       = $type === 'model' ? "Model" : "Controller";

    $className = "App\\Modules\\" . ucfirst($module) . "\\" . $subNamespace . $controller . $suffix;

    if (class_exists($className)) {
      $handler = new $className($this);

      if (method_exists($handler, 'load')) {
        $handler->load();
      } else {
        $this->json(['notify' => ['message' => 'Метод load() не найден в классе', 'type' => 'error']]);
      }
    } else {
      $this->json(['notify' => ['message' => "Ресурс $className не найден", 'type' => 'error']]);
    }
  }

  public function json(array $data): string {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
  }

  public function html(string $path, array $data = []): string {
    if (!file_exists($path)) return '';
    extract($data);
    ob_start();
    require $path;
    return ob_get_clean();
  }

  public function handleError($errno, $errstr, $errfile, $errline) {
  }
  public function handleException($exception) {
  }
  public function handleFatalError() {
  }

  public function declension(int|float $number, array $titles): string {
    $absNumber = abs((int)$number);

    $mod10 = $absNumber % 10;
    $mod100 = $absNumber % 100;

    if ($mod100 >= 11 && $mod100 <= 14) {
      return $titles[2];
    }

    return match ($mod10) {
      1       => $titles[0],
      2, 3, 4 => $titles[1],
      default => $titles[2],
    };
  }

  public static function random(int $length = 10, bool $safe = true): string {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPRQSTUVWXYZ0123456789';
    if (!$safe) {
      $chars .= '$()#@!';
    }
    $string = '';
    $len = strlen($chars) - 1;
    while (strlen($string) < $length) {
      $string .= $chars[mt_rand(0, $len)];
    }
    return $string;
  }

  public static function ip(): string {
    $keys = [
      'HTTP_CF_CONNECTING_IP',
      'HTTP_X_FORWARDED_FOR',
      'HTTP_X_REAL_IP',
      'HTTP_CLIENT_IP',
      'REMOTE_ADDR'
    ];

    foreach ($keys as $key) {
      if (!empty($_SERVER[$key])) {
        $ips = explode(',', $_SERVER[$key]);
        $ip = trim($ips[0]);

        if (filter_var($ip, FILTER_VALIDATE_IP)) {
          return $ip;
        }
      }
    }

    return '0.0.0.0';
  }

  public static function login2uuid(string $username): string {
    $hash = md5("OfflinePlayer:" . $username, true);
    $bytes = unpack('C16', $hash);

    $bytes[7] = ($bytes[7] & 0x0f) | 0x30;
    $bytes[9] = ($bytes[9] & 0x3f) | 0x80;

    return sprintf(
      '%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x',
      $bytes[1],
      $bytes[2],
      $bytes[3],
      $bytes[4],
      $bytes[5],
      $bytes[6],
      $bytes[7],
      $bytes[8],
      $bytes[9],
      $bytes[10],
      $bytes[11],
      $bytes[12],
      $bytes[13],
      $bytes[14],
      $bytes[15],
      $bytes[16]
    );
  }


  // public function random(int $length = 10, bool $safe = true): string {
  //   $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPRQSTUVWXYZ0123456789';
  //   if (!$safe) {
  //     $chars .= '$()#@!';
  //   }
  //   $string = '';
  //   $len = strlen($chars) - 1;
  //   while (strlen($string) < $length) {
  //     $string .= $chars[mt_rand(0, $len)];
  //   }
  //   return $string;
  // }


  public static function formatDate($timestamp = null) {
    if ($timestamp === null) {
      $timestamp = time();
    }

    $months = [
      'January' => 'января',
      'February' => 'февраля',
      'March' => 'марта',
      'April' => 'апреля',
      'May' => 'мая',
      'June' => 'июня',
      'July' => 'июля',
      'August' => 'августа',
      'September' => 'сентября',
      'October' => 'октября',
      'November' => 'ноября',
      'December' => 'декабря'
    ];

    $monthEn = date('F', $timestamp);
    $monthRu = $months[$monthEn];

    return date('j', $timestamp) . ' ' . $monthRu . ' ' . date('Y, H:i', $timestamp);
  }
}
