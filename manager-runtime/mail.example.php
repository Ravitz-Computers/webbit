<?php
// Server-side configuration only. No email service is required.
// Resend preset: host smtp.resend.com, port 465, encryption smtps, username resend.
// Use a verified sender domain with your chosen provider.
return [
    'enabled' => false,
    'host' => 'smtp.resend.com',
    'port' => 465,
    'encryption' => 'smtps',
    'username' => 'resend',
    'password' => getenv('WEBBIT_SMTP_PASSWORD') ?: '',
    'from' => '',
    'to' => '',
];
