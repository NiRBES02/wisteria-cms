<?php

namespace App\Classes;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

class Mailer {
  private PHPMailer $mail;

  public function __construct(string $host, string $username, string $password, int $port = 465) {
    $this->mail = new PHPMailer(true);

    $this->mail->isSMTP();

    $this->mail->Host = $host;
    $this->mail->Username = $username;
    $this->mail->Password = $password;
    $this->mail->Port = $port;


    $this->mail->SMTPAuth = true;
    $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $this->mail->CharSet = 'UTF-8';
    $this->mail->isHTML(true);
  }

  /**
   * Настраивает SMTP-сервер
   */
  // public function configureSmtp(string $host, string $username, string $password, int $port = 465): self {
  //   $this->mail->Host = $host;
  //   $this->mail->Username = $username;
  //   $this->mail->Password = $password;
  //   $this->mail->Port = $port;

  //   return $this;
  // }

  /**
   * Устанавливает отправителя
   */
  public function from(string $email, string $name = ''): self {
    $this->mail->setFrom($email, $name);
    return $this;
  }

  /**
   * Добавляет получателя
   */
  public function to(string $email, string $name = ''): self {
    $this->mail->addAddress($email, $name);
    return $this;
  }

  /**
   * Добавляет тему письма
   */
  public function subject(string $subject): self {
    $this->mail->Subject = $subject;
    return $this;
  }

  /**
   * Устанавливает HTML-тело письма
   */
  public function body(string $body): self {
    $this->mail->Body = $body;
    return $this;
  }

  /**
   * Устанавливает текстовую версию письма
   */
  public function altBody(string $text): self {
    $this->mail->AltBody = $text;
    return $this;
  }

  /**
   * Добавляет вложение
   */
  public function attach(string $path, string $name = ''): self {
    $this->mail->addAttachment($path, $name);
    return $this;
  }

  /**
   * Отправляет письмо и очищает список адресатов/вложений
   *
   * @return array ['success' => bool, 'error' => string|null]
   */
  public function send(): array {
    try {
      $this->mail->send();

      $this->mail->clearAddresses();
      $this->mail->clearAttachments();

      return ['success' => true, 'error' => null];
    } catch (Exception $e) {
      return ['success' => false, 'error' => $this->mail->ErrorInfo];
    }
  }
}
