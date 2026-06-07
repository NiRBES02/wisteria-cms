<?php
if (!defined('devsakura')) exit('denied');

@ini_set('session.cookie_httponly', 1);
@ini_set('session.use_only_cookies', 1);

if (!session_start())
  session_start();

header('Content-Type: text/html; charset=UTF-8');


// define('_Root', dirname(__FILE__));

// define('_App', _Root . '/app');
// define('_App_Configs', _App . '/configs');
// define('_App_Classes', _App . '/classes');

// define('_App_Modules', _App . '/modules');

// define('_Public', _Root . '/public');
// define('_Public_Assets', _Public . '/assets');
// define('_Public_Assets_Css', _Public_Assets . '/css');
// define('_Public_Assets_Js', _Public_Assets . '/js');
// define('_Public_Assets_Img', _Public_Assets . '/img');
// define('_Public_Uploads', _Public . '/uploads');
// define('_Public_Uploads_Users', _Public_Uploads . '/users');

// define('_Static', _Root . '/static');
// define('_Static_Layouts', _Static . '/layouts');
// define('_Static_Page', _Static . '/page');

// define('_Layouts', _Static . '/layouts');

define('_Root', dirname(__FILE__));

define('_App', _Root . '/application');
define('_Modules', _App . '/Modules');
define('_Layouts', _App . '/Static/Layouts');
define('_Configs', _App . '/Configs');
define('_Assets', _Root . '/public/assets');
define('_Uploade_Users', _Root . '/public/uploads/users');



if (file_exists(_Root . '/vendor/autoload.php')) {
  require_once(_Root . '/vendor/autoload.php');
} else {
  exit('Запустите "composer install" для генерации автозагрузчика зависимостей.');
}
