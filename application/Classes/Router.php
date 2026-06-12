<?php

namespace App\Classes;

use FastRoute\Dispatcher;
use FastRoute\RouteCollector;
use function FastRoute\simpleDispatcher;

if (!defined('devsakura')) exit('denied');

class Router {
    private string $method;
    private string $uri;

    private string $module = 'main';
    private string $controller = 'Index';
    private string $targetType = 'controller';
    private array $params = [];

    public function __construct() {
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->uri = $this->prepareUri();
        $this->dispatch();
    }

    private function prepareUri(): string {
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
        if (strpos($uri, $scriptName) === 0) {
            $uri = substr($uri, strlen($scriptName));
        } elseif (strpos($uri, '/index.php') === 0) {
            $uri = substr($uri, 10);
        }
        return '/' . trim($uri, '/');
    }

    /**
     * Основной процесс маршрутизации через FastRoute
     */
    private function dispatch(): void {
        $dispatcher = simpleDispatcher(function (RouteCollector $r) {
            // Главная страница (GET)
            $r->addRoute('GET', '/', 'main/Index');

            // API маршруты для Моделей: /auth/api/login, /user/api/settings
            $r->addRoute(['GET', 'POST'], '/{module}/api/{action:.+}', 'module_api');

            // Обычные маршруты для Контроллеров: /auth/login, /user/settings
            $r->addRoute(['GET', 'POST'], '/{module}/{action:.+}', 'module_action');

            // Корневой маршрут модуля: /auth, /user
            $r->addRoute(['GET', 'POST'], '/{module}', 'module_root');
        });

        $routeInfo = $dispatcher->dispatch($this->method, $this->uri);

        switch ($routeInfo[0]) {
            case Dispatcher::NOT_FOUND:
                $this->module = 'main';
                $this->controller = 'Error404';
                $this->targetType = 'controller';
                break;

            case Dispatcher::METHOD_NOT_ALLOWED:
                $this->module = 'main';
                $this->controller = 'Error405';
                $this->targetType = 'controller';
                break;

            case Dispatcher::FOUND:
                $this->resolveMagicRoute($routeInfo[1], $routeInfo[2]);
                break;
        }
    }

    private function resolveMagicRoute(string $handler, array $vars): void {
        if ($handler === 'main/Index') {
            $this->module = 'main';
            $this->controller = 'Index';
            $this->targetType = 'controller';
            return;
        }

        $this->module = $vars['module'] ?? 'main';

        if ($handler === 'module_root') {
            $this->controller = 'Index';
            $this->targetType = 'controller';
            return;
        }

        $actionFull = $vars['action'];
        $segments = explode('/', $actionFull);
        $action = $segments[0];

        $this->controller = ucfirst($action);
        $this->params = array_slice($segments, 1);

        if ($handler === 'module_api') {
            $this->targetType = 'model';
        } else {
            $this->targetType = 'controller';
        }
    }

    // ГЕТТЕРЫ
    public function getModule(): string {
        return $this->module;
    }
    public function getController(): string {
        return $this->controller;
    }
    public function getTargetType(): string {
        return $this->targetType;
    }
    public function getParams(): array {
        return $this->params;
    }
    public function getParam(int $index, $default = null) {
        return $this->params[$index] ?? $default;
    }
}
