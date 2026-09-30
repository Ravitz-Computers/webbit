<?php
declare(strict_types=1);
namespace Webbit\Manager;
require_once __DIR__ . '/AuthStore.php';

/** Publishes only the fixed template fields selected during generation. */
final class ContentStore
{
    private string $private;
    private string $public;
    private array $schema;

    public function __construct(string $private, string $public)
    {
        $this->private = AuthStore::privateDirectory($private, $public);
        $this->public = realpath($public);
        $this->schema = json_decode(file_get_contents($this->private . '/schema.json'), true, 64, JSON_THROW_ON_ERROR);
        if (($this->schema['version'] ?? null) !== 1 || !is_array($this->schema['fields'] ?? null) || !is_array($this->schema['pages'] ?? null)) {
            throw new \RuntimeException('Unsupported manager schema');
        }
    }

    public function schema(): array { return $this->schema; }

    private function state(): array
    {
        $file = $this->private . '/content.json';
        if (is_file($file)) { return json_decode(file_get_contents($file), true, 64, JSON_THROW_ON_ERROR); }
        $values = []; $hashes = [];
        foreach ($this->schema['fields'] as $field) { $values[$field['id']] = $field['value']; }
        foreach ($this->schema['pages'] as $page) { $hashes[$page['path']] = $page['hash']; }
        return ['revision' => 0, 'values' => $values, 'hashes' => $hashes];
    }

    public function read(): array
    {
        return $this->locked(fn(): array => $this->state());
    }

    private function locked(callable $action): mixed
    {
        $file = $this->private . '/content.lock';
        if (is_link($file)) { throw new \RuntimeException('Unsafe content lock'); }
        $lock = fopen($file, 'c+b');
        if (!$lock) { throw new \RuntimeException('Cannot lock content'); }
        chmod($file, 0600);
        try {
            if (!flock($lock, LOCK_EX)) { throw new \RuntimeException('Cannot lock content'); }
            if (is_file($this->private . '/publish-pending.json')) { throw new \RuntimeException('A previous publish was interrupted. Restore the recorded backup before publishing again.'); }
            return $action();
        } finally { flock($lock, LOCK_UN); fclose($lock); }
    }

    private function pagePath(string $path): string
    {
        if (!preg_match('~^[\p{L}\p{N}_./ -]+\.html?$~uiD', $path) || str_starts_with($path, '/')) {
            throw new \RuntimeException('Unsafe managed page path');
        }
        $target = $this->public;
        foreach (explode('/', $path) as $part) {
            if ($part === '' || $part === '.' || $part === '..') { throw new \RuntimeException('Unsafe managed page path'); }
            $target .= DIRECTORY_SEPARATOR . $part;
            if (is_link($target)) { throw new \RuntimeException('Managed page cannot contain symbolic links'); }
        }
        if (!is_file($target)) { throw new \RuntimeException('Managed page is missing'); }
        return $target;
    }

    private static function encode(string $value): string { return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8'); }

    private function validated(array $input): array
    {
        $values = [];
        foreach ($this->schema['fields'] as $field) {
            $value = $input[$field['id']] ?? null;
            if (!is_string($value) || strlen($value) > 10000 || str_contains($value, "\0")) { throw new \InvalidArgumentException('Invalid field value'); }
            if ($field['kind'] === 'image' && !preg_match('~^https://[^\s<>"\x00-\x1f]+$~D', $value)) {
                if (!preg_match('~^[\p{L}\p{N}_./ -]+$~uD', $value) || str_starts_with($value, '//')) { throw new \InvalidArgumentException('Images must use a local path or an HTTPS URL'); }
                $parts = str_starts_with($value, '/') ? [] : explode('/', dirname($field['page']));
                if ($parts === ['.']) { $parts = []; }
                foreach (explode('/', $value) as $part) {
                    if ($part === '' || $part === '.') { continue; }
                    if ($part === '..') { if (!$parts) { throw new \InvalidArgumentException('Image path escapes the website'); } array_pop($parts); }
                    else { $parts[] = $part; }
                }
                $image = realpath($this->public . '/' . implode('/', $parts));
                $prefix = $this->public . DIRECTORY_SEPARATOR;
                if (PHP_OS_FAMILY === 'Windows') { $image = $image === false ? false : strtolower($image); $prefix = strtolower($prefix); }
                if ($image === false || !str_starts_with($image, $prefix) || !is_file($image)) { throw new \InvalidArgumentException('Local image is missing or outside the website'); }
            }
            $values[$field['id']] = $value;
        }
        if (count($input) !== count($values)) { throw new \InvalidArgumentException('Unknown content fields'); }
        return $values;
    }

    private function render(array $page, array $values): string
    {
        $output = '';
        foreach ($page['segments'] as $segment) {
            if (is_string($segment)) { $output .= $segment; continue; }
            $id = $segment['field'];
            // Unchanged fields retain their exact original source spelling/whitespace.
            if ($values[$id] === $segment['initial']) { $output .= $segment['original']; continue; }
            $value = self::encode($values[$id]);
            if (isset($segment['attribute'])) {
                if (!in_array($segment['attribute'], ['src', 'alt', 'content'], true)) { throw new \RuntimeException('Invalid template attribute'); }
                $output .= $segment['attribute'] . '="' . $value . '"';
            } else { $output .= $value; }
        }
        return $output;
    }

    /** Preview never writes public files. The caller must display it in an inert sandbox. */
    public function preview(array $input): array
    {
        $values = $this->validated($input); $pages = [];
        foreach ($this->schema['pages'] as $page) { $pages[$page['path']] = $this->render($page, $values); }
        return $pages;
    }

    public function publish(array $input, int $revision): array
    {
        return $this->locked(function () use ($input, $revision): array {
            $state = $this->state();
            if ($state['revision'] !== $revision) { throw new \RuntimeException('Content changed in another session. Reload before publishing.'); }
            $values = $this->validated($input); $changes = [];
            foreach ($this->schema['pages'] as $page) {
                $target = $this->pagePath($page['path']); $before = file_get_contents($target);
                if (!hash_equals($state['hashes'][$page['path']], hash('sha256', $before))) { throw new \RuntimeException('A website file changed outside the manager. Regenerate the manager from the updated source.'); }
                $after = $this->render($page, $values);
                $changes[] = ['path' => $page['path'], 'target' => $target, 'before' => $before, 'after' => $after];
            }
            $backup = $this->private . '/backup-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(4));
            if (!mkdir($backup, 0700)) { throw new \RuntimeException('Cannot create backup'); }
            $pending = $this->private . '/publish-pending.json';
            $this->write($backup . '/content.json', json_encode($state, JSON_THROW_ON_ERROR));
            foreach ($changes as $i => $change) { $this->write($backup . '/' . $i . '.html', $change['before']); }
            $this->write($pending, json_encode(['backup' => basename($backup), 'paths' => array_column($changes, 'path')], JSON_THROW_ON_ERROR));
            try {
                foreach ($changes as $change) { $this->write($change['target'], $change['after']); $state['hashes'][$change['path']] = hash('sha256', $change['after']); }
                $state['revision']++; $state['values'] = $values;
                $this->write($this->private . '/content.json', json_encode($state, JSON_THROW_ON_ERROR));
                unlink($pending);
                return $state;
            } catch (\Throwable $error) {
                // Keep the journal if any restoration fails; later publishes will fail closed.
                foreach ($changes as $change) { $this->write($change['target'], $change['before']); }
                $this->write($this->private . '/content.json', file_get_contents($backup . '/content.json'));
                unlink($pending);
                throw $error;
            }
        });
    }

    private function write(string $target, string $data): void
    {
        if (is_link($target)) { throw new \RuntimeException('Refusing linked output'); }
        $temporary = $target . '.' . bin2hex(random_bytes(8)) . '.tmp';
        $handle = fopen($temporary, 'x+b');
        if (!$handle) { throw new \RuntimeException('Cannot stage content'); }
        try {
            chmod($temporary, str_starts_with($target, $this->private . DIRECTORY_SEPARATOR) || str_starts_with($target, $this->private . '/') ? 0600 : 0644);
            if (fwrite($handle, $data) !== strlen($data) || !fflush($handle) || !fsync($handle)) { throw new \RuntimeException('Cannot write complete content'); }
        } finally { fclose($handle); }
        if (!rename($temporary, $target)) { unlink($temporary); throw new \RuntimeException('Cannot replace content'); }
    }
}
