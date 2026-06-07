<?
if (!defined('devsakura'))
  exit('Denied');

$manifestPath = _Assets . '/js/devsakura/manifest.json';
$manifest = json_decode(file_get_contents($manifestPath), true);

$externalJs = [];

$internalJs = [];

if (isset($manifest['runtime.js'])) {
  $internalJs[] = $manifest['runtime.js'];
}

foreach ($manifest as $key => $path) {
  if (str_ends_with($key, '.js') && !in_array($key, ['runtime.js', 'main.js'])) {
    $internalJs[] = $path;
  }
}

if (isset($manifest['main.js'])) {
  $internalJs[] = $manifest['main.js'];
}

return [
  'css' => [
    // "/public/assets/css/custom.css",
    "/public/assets/css/tailwind.css",
    "/public/assets/fontawesome/css/all.css",
    "/public/assets/fontawesome/css/duotone-regular.css",
    "/public/assets/fontawesome/css/jelly-duo-regular.css",
    "/public/assets/fontawesome/css/notdog-duo-solid.css",
    "/public/assets/fontawesome/css/chisel-regular.css",
    "/public/assets/fontawesome/css/thin.css",
  ],
  'js' => array_merge($externalJs, $internalJs)
];
