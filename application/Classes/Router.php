<?php

namespace App\Classes;

use FastRoute\Dispatcher;
use FastRoute\RouteCollector;
use function FastRoute\simpleDispatcher;

if (!defined('devsakura')) exit('denied');

class Router {
    private string $method;
    private string $uri;

    // Эти свойства остаются для совместимости с твоим Core.php
    private string $module = 'main';
    private string $controller = 'Index';
    private string $targetType = 'controller';
    private array $params = [];

    public function __construct() {
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->uri = $this->prepareUri();
        $this->dispatch();
    }


    /**
     * Очистка URI от параметров запроса, index.php и лишних слешей
     */
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
        // Создаем диспетчер FastRoute
        $dispatcher = simpleDispatcher(function (RouteCollector $r) {
            // 1. Главная страница (теперь со слешем)
            $r->addRoute('GET', '/', 'main/Index');

            // 2. Маршрут модуля: /user, /admin
            $r->addRoute(['GET', 'POST'], '/{module}', 'module_root');

            // 3. Маршрут действия: /user/settings
            $r->addRoute(['GET', 'POST'], '/{module}/{action:.+}', 'module_action');
        });

        $routeInfo = $dispatcher->dispatch($this->method, $this->uri);

        switch ($routeInfo[0]) {
            case Dispatcher::NOT_FOUND:
                // 404 обработка (Core.php это подхватит)
                $this->module = 'main';
                $this->controller = 'Error404';
                break;

            case Dispatcher::METHOD_NOT_ALLOWED:
                $this->module = 'main';
                $this->controller = 'Error405';
                break;

            case Dispatcher::FOUND:
                $handler = $routeInfo[1];
                $vars = $routeInfo[2];
                $this->resolveMagicRoute($handler, $vars);
                break;
        }
    }

    /**
     * Та самая «Магия» определения Контроллер/Модель/ID
     */
    private function resolveMagicRoute(string $handler, array $vars): void {
        if ($handler === 'main/Index') {
            $this->module = 'main';
            $this->controller = 'Index';
            return;
        }

        // Определяем модуль
        $this->module = $vars['module'] ?? 'main';
        $moduleNamespace = "App\\Modules\\" . ucfirst($this->module);

        // Если зашли просто в /module
        if ($handler === 'module_root') {
            $this->controller = 'Index';
            $this->targetType = 'controller';
            return;
        }

        // Если зашли в /module/action...
        if ($handler === 'module_action') {
            $actionFull = $vars['action']; // Здесь может быть 'settings' или '123/profile'
            $segments = explode('/', $actionFull);
            $action = $segments[0]; // Первое слово после модуля
            $actionFormatted = ucfirst($action);

            // Проверяем существование классов по PSR-4
            $controllerClass = $moduleNamespace . "\\Controllers\\" . $actionFormatted . "Controller";
            $modelClass      = $moduleNamespace . "\\Models\\" . $actionFormatted . "Model";

            if (class_exists($controllerClass)) {
                $this->controller = $actionFormatted;
                $this->targetType = 'controller';
                // Все остальное после action уходит в параметры
                $this->params = array_slice($segments, 1);
            } elseif (class_exists($modelClass)) {
                $this->controller = $actionFormatted;
                $this->targetType = 'model';
                $this->params = array_slice($segments, 1);
            } else {
                // Это ID или параметр -> идем в IndexController
                $this->controller = 'Index';
                $this->targetType = 'controller';
                // Весь остаток (включая action) становится параметрами
                $this->params = $segments;
            }
        }
    }

    // --- Геттеры для Core.php (без изменений) ---

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

    public function isAjax(): bool {
        return isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
            strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    }

    public function isPost(): bool {
        return $this->method === 'POST';
    }
    public function isGet(): bool {
        return $this->method === 'GET';
    }
}
