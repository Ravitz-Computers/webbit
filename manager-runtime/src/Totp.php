<?php
declare(strict_types=1);
namespace Webbit\Manager;

/** RFC 6238, SHA-1 / six digits / 30 seconds for authenticator compatibility. */
final class Totp
{
    public static function secret(): string { return self::base32(random_bytes(20)); }

    public static function base32(string $bytes): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $buffer = 0; $bits = 0; $out = '';
        foreach (unpack('C*', $bytes) as $byte) {
            $buffer = ($buffer << 8) | $byte; $bits += 8;
            while ($bits >= 5) { $bits -= 5; $out .= $alphabet[($buffer >> $bits) & 31]; }
            $buffer &= (1 << $bits) - 1;
        }
        if ($bits) { $out .= $alphabet[($buffer << (5 - $bits)) & 31]; }
        return $out;
    }

    private static function decode(string $secret): string
    {
        if (!preg_match('/^[A-Z2-7]{32}$/D', $secret)) { throw new \InvalidArgumentException('Invalid TOTP secret'); }
        $buffer = 0; $bits = 0; $out = '';
        foreach (str_split($secret) as $char) {
            $buffer = ($buffer << 5) | strpos('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', $char); $bits += 5;
            if ($bits >= 8) { $bits -= 8; $out .= chr(($buffer >> $bits) & 255); }
            $buffer &= (1 << $bits) - 1;
        }
        return $out;
    }

    public static function code(string $secret, int $step, int $digits = 6): string
    {
        if ($step < 0 || !in_array($digits, [6, 8], true)) { throw new \InvalidArgumentException('Invalid TOTP parameters'); }
        $counter = pack('N2', intdiv($step, 4294967296), $step % 4294967296);
        $digest = hash_hmac('sha1', $counter, self::decode($secret), true);
        $offset = ord($digest[19]) & 15;
        $number = unpack('N', substr($digest, $offset, 4))[1] & 0x7fffffff;
        return str_pad((string) ($number % (10 ** $digits)), $digits, '0', STR_PAD_LEFT);
    }

    /** Returns the accepted counter; the caller must persist it atomically to prevent replay. */
    public static function matchStep(string $secret, string $code, int $now, int $lastStep): ?int
    {
        if ($now < 0 || !preg_match('/^[0-9]{6}$/D', $code)) { return null; }
        $current = intdiv($now, 30);
        foreach ([$current, $current - 1, $current + 1] as $step) {
            if ($step >= 0 && $step > $lastStep && hash_equals(self::code($secret, $step), $code)) { return $step; }
        }
        return null;
    }

    public static function enrollmentUri(string $secret, string $username, string $issuer = 'Webbit'): string
    {
        self::decode($secret);
        return 'otpauth://totp/' . rawurlencode($issuer . ':' . $username) . '?' . http_build_query([
            'secret' => $secret, 'issuer' => $issuer, 'algorithm' => 'SHA1', 'digits' => 6, 'period' => 30,
        ], '', '&', PHP_QUERY_RFC3986);
    }
}
