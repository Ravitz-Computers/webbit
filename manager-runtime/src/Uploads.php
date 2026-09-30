<?php
declare(strict_types=1);
namespace Webbit\Manager;
final class Uploads
{
    public static function fromRequest(array $file, string $public): string
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_string($file['tmp_name'] ?? null) || !is_uploaded_file($file['tmp_name'])) { throw new \InvalidArgumentException('Choose a valid image upload.'); }
        if (filesize($file['tmp_name']) > 5 * 1024 * 1024) { throw new \InvalidArgumentException('Images must be at most 5 MB.'); }
        return self::store(file_get_contents($file['tmp_name']), $public);
    }

    /** Decode and re-encode: never publish original uploaded bytes or filenames. */
    public static function store(string $bytes, string $public): string
    {
        if (!extension_loaded('gd')) { throw new \RuntimeException('Enable PHP GD to import images. Text editing remains available.'); }
        if (strlen($bytes) > 5 * 1024 * 1024) { throw new \InvalidArgumentException('Images must be at most 5 MB.'); }
        $info = @getimagesizefromstring($bytes);
        if (!$info || !in_array($info[2], [IMAGETYPE_PNG, IMAGETYPE_JPEG, IMAGETYPE_WEBP], true) || $info[0] < 1 || $info[1] < 1 || $info[0] * $info[1] > 16000000) { throw new \InvalidArgumentException('Use a PNG, JPEG or WebP image up to 16 megapixels.'); }
        $image = @imagecreatefromstring($bytes);
        if ($image === false) { throw new \InvalidArgumentException('Image could not be decoded.'); }
        $public = realpath($public);
        if ($public === false) { throw new \RuntimeException('Website folder is missing.'); }
        $directory = $public;
        foreach (['assets', 'uploads'] as $part) {
            $directory .= DIRECTORY_SEPARATOR . $part;
            if (is_link($directory)) { throw new \RuntimeException('Upload directory cannot contain links.'); }
            if (!is_dir($directory) && !mkdir($directory, 0755)) { throw new \RuntimeException('Cannot create upload directory.'); }
        }
        $extension = [IMAGETYPE_PNG => 'png', IMAGETYPE_JPEG => 'jpg', IMAGETYPE_WEBP => 'webp'][$info[2]];
        $filename = bin2hex(random_bytes(16)) . '.' . $extension;
        $target = $directory . DIRECTORY_SEPARATOR . $filename;
        $output = fopen($target, 'x+b');
        if (!$output) { throw new \RuntimeException('Cannot create image.'); }
        try {
            imagealphablending($image, false); imagesavealpha($image, true);
            $written = match ($info[2]) { IMAGETYPE_PNG => imagepng($image, $output, 6), IMAGETYPE_JPEG => imagejpeg($image, $output, 90), IMAGETYPE_WEBP => imagewebp($image, $output, 90) };
            if (!$written || !fflush($output)) { throw new \RuntimeException('Cannot write image.'); }
            chmod($target, 0644);
        } catch (\Throwable $error) { fclose($output); unlink($target); throw $error; }
        fclose($output);
        return '/assets/uploads/' . $filename;
    }
}
