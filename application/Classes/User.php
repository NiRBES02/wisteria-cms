<?php

namespace App\Classes;

if (!defined('devsakura')) exit('denied');

use \App\Classes\Core;

class User {
  public int $id;
  public string $uuid;
  public string $login;
  public ?string $skin = null;
  public ?string $skinUrl = null;
  public string $group;

  private static array $groupMap = [
    'player'    => ['name' => 'Игрок', 'color' => 'text-white'],
    'vip'       => ['name' => 'VIP', 'color' => 'text-yellow-500'],
    'premium'   => ['name' => 'Premium', 'color' => 'text-orange-500'],
    'moderator' => ['name' => 'Moderator', 'color' => 'text-blue-500'],
    'admin'     => ['name' => 'Администратор', 'color' => 'text-red-500'],
    'dev'       => ['name' => 'Разработчик', 'color' => 'text-purple-500 font-bold italic']
  ];

  public function __construct(array $data) {
    $this->id = (int)($data['id'] ?? 0);
    $this->uuid = $data['uuid'] ?? '';
    $this->login = $data['login'] ?? 'Гость';
    $this->skin = $data['skin'] ?? null;
    $this->skinUrl = $data['skinUrl'] ?? null;
    $this->group = $data['group'] ?? 'player';
  }

  public function getGroupName(): string {
    return self::$groupMap[$this->group]['name'] ?? 'Неизвестно';
  }

  public function getGroupColor(): string {
    return self::$groupMap[$this->group]['color'] ?? 'text-white';
  }
}
