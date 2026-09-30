<?php
declare(strict_types=1);
namespace Webbit\Manager;
require_once __DIR__ . '/../vendor/phpmailer/Exception.php';
require_once __DIR__ . '/../vendor/phpmailer/PHPMailer.php';
require_once __DIR__ . '/../vendor/phpmailer/SMTP.php';
use PHPMailer\PHPMailer\PHPMailer;

final class Mailer
{
    public static function send(array $config, string $subject, string $message): bool
    {
        if (($config['enabled'] ?? false) !== true) { return false; }
        try {
            if (!in_array($config['encryption'] ?? '', ['starttls', 'smtps'], true) || !filter_var($config['to'] ?? '', FILTER_VALIDATE_EMAIL) || !filter_var($config['from'] ?? '', FILTER_VALIDATE_EMAIL)) { throw new \RuntimeException('Invalid email configuration'); }
            $mail = new PHPMailer(true);
            $mail->isSMTP(); $mail->SMTPDebug = 0; $mail->Timeout = 10;
            $mail->Host = $config['host']; $mail->Port = (int) $config['port'];
            $mail->SMTPAuth = true; $mail->Username = $config['username']; $mail->Password = $config['password'];
            $mail->SMTPSecure = $config['encryption'] === 'smtps' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
            $mail->SMTPOptions = ['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'allow_self_signed' => false]];
            $mail->CharSet = 'UTF-8'; $mail->setFrom($config['from'], 'Webbit Website Manager'); $mail->addAddress($config['to']);
            $mail->Subject = $subject; $mail->Body = $message;
            return $mail->send();
        } catch (\Throwable) { error_log('Webbit: optional SMTP delivery failed; check private mail configuration.'); return false; }
    }
}
