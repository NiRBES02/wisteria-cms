<?php
if (!defined('devsakura')) exit('denied');

@ini_set('session.cookie_httponly', 1);
@ini_set('session.use_only_cookies', 1);
@ini_set('session.gc_maxlifetime', 1800);
@ini_set('session.cookie_lifetime', 1800);

header('Content-Type: text/html; charset=UTF-8');

define('_Root', dirname(__FILE__));

define('_App', _Root . '/application');
define('_Modules', _App . '/Modules');
define('_Layouts', _App . '/Static/Layouts');
define('_Configs', _App . '/Configs');
define('_Assets', _Root . '/public/assets');
define('_Uploads', _Root . '/public/uploads');

if (file_exists(_Root . '/vendor/autoload.php')) {
  require_once(_Root . '/vendor/autoload.php');
} else {
  exit('Запустите "composer install" для генерации автозагрузчика зависимостей.');
}

$dotenv = Dotenv\Dotenv::createImmutable(_Root);
$dotenv->load();
