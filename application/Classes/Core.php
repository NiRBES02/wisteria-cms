<?php

namespace App\Classes;

if (!defined('devsakura')) exit('denied');

class Core {
  public Config $config;
  public Database $database;
  public Router $router;
  public AuthService $auth;
  public LayoutManager $layoutManager;

  public function __construct() {
    ob_start();

    // set_error_handler([$this, 'handleError']);
    // set_exception_handler([$this, 'handleException']);
    // register_shutdown_function([$this, 'handleFatalError']);

    $this->config        = new Config($this);
    $this->database      = new Database($this);
    $this->router        = new Router();
    $this->auth          = new AuthService($this->database);
    $this->layoutManager = new LayoutManager($this);
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
}
