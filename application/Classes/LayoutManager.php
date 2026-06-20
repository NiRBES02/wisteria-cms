<?php

namespace App\Classes;

if (!defined('devsakura')) exit('denied');

class LayoutManager {
  private Core $core;
  private string $layout;
  private ?array $content = null;
  private ?array $navbar = null;
  private array $navbarDefault;
  private ?array $footer = null;
  private array $footerDefault;
  private ?array $contentScripts = null;
  private array $contentScriptsDefault;
  private ?array $navbarScripts = null;
  private array $navbarScriptsDefault;
  private ?array $footerScripts = null;
  private array $footerScriptsDefault;
  private array $defaults;

  public function __construct(Core $core) {
    $this->core = $core;
    $this->loadDefaults();
    $this->reset();
  }

  private function loadDefaults(): void {
    $isAuth = $this->core->auth->isAuth() ? 'Auth' : 'Unauth';

    $this->defaults = [
      'layout' => 'main',
      'navbar' => ['navbar' => $this->core->html(_Modules . '/Navbar/Views/Index.phtml')],
      'footer' => [],
      'navbarScripts' => ["/application/Modules/Navbar/Public/Js/{$isAuth}.js"],
      'footerScripts' => [],
      'contentScripts' => [],
    ];
  }

  public function reset(): self {
    $this->layout = $this->defaults['layout'] ?? 'main';
    $this->content = null;
    $this->navbar = null;
    $this->footer = null;
    $this->contentScripts = null;
    $this->navbarScripts = null;
    $this->footerScripts = null;

    $this->navbarDefault = $this->defaults['navbar'] ?? ['navbar' => $this->core->html(_Modules . '/Navbar/Views/Index.phtml')];
    $this->footerDefault = $this->defaults['footer'] ?? [];
    $this->navbarScriptsDefault = $this->defaults['navbarScripts'] ?? [];
    $this->contentScriptsDefault = $this->defaults['contentScripts'] ?? [];
    $this->footerScriptsDefault = $this->defaults['footerScripts'] ?? [];

    return $this;
  }

  public function setLayout(string $layout): self {
    $this->layout = $layout;
    return $this;
  }
  public function getLayout(): string {
    return $this->layout;
  }
  public function setContent(?array $content): self {
    $this->content = $content;
    return $this;
  }
  public function getContent(): ?array {
    return $this->content;
  }
  public function setNavbar(?array $navbar): self {
    $this->navbar = $navbar;
    return $this;
  }
  public function getNavbar(): ?array {
    return $this->navbar;
  }

  public function addNavbar(string $elementId, string $htmlContent): self {
    if ($this->navbar === null) {
      $this->navbar = $this->navbarDefault;
    }
    $this->navbar[$elementId] = $htmlContent;
    return $this;
  }

  public function setFooter(?array $footer): self {
    $this->footer = $footer;
    return $this;
  }
  public function getFooter(): ?array {
    return $this->footer;
  }
  public function setContentScripts(?array $scripts): self {
    $this->contentScripts = $scripts;
    return $this;
  }
  public function getContentScripts(): ?array {
    return $this->contentScripts;
  }
  public function setNavbarScripts(?array $scripts): self {
    $this->navbarScripts = $scripts;
    return $this;
  }
  public function getNavbarScripts(): ?array {
    return $this->navbarScripts;
  }
  public function setFooterScripts(?array $scripts): self {
    $this->footerScripts = $scripts;
    return $this;
  }
  public function getFooterScripts(): ?array {
    return $this->footerScripts;
  }
  public function getFooterScriptsDefault(): array {
    return $this->footerScriptsDefault;
  }
  public function getNavbarScriptsDefault(): array {
    return $this->navbarScriptsDefault;
  }
  public function getNavbarDefault(): array {
    return $this->navbarDefault;
  }
  public function getFooterDefault(): array {
    return $this->footerDefault;
  }

  public function render(array $data = []): string {
    $path = _Layouts . '/' . $this->layout . '.phtml';
    if (!file_exists($path)) {
      $path = _Layouts . '/main.phtml';
      $this->layout = 'main';
    }

    $layoutTemplate = $this->core->html($path);

    return $this->core->json([
      'layout' => [
        'layoutName' => $this->layout,
        'layoutTemplate' => $layoutTemplate,
        'content' => $this->content,
        'navbar' => $this->navbar,
        'navbarDefault' => $this->navbarDefault,
        'footer' => $this->footer,
        'footerDefault' => $this->footerDefault,
        'contentScripts' => $this->getContentScripts(),
        'contentScriptsDefault' => $this->contentScriptsDefault,
        'navbarScripts' => $this->navbarScripts,
        'navbarScriptsDefault' => $this->navbarScriptsDefault,
        'footerScripts' => $this->footerScripts,
        'footerScriptsDefault' => $this->footerScriptsDefault,
      ],
      'data' => $data
    ]);
  }
}
