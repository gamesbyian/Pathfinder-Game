<?php
declare(strict_types=1);

const SUBMISSION_PAYLOAD_LIMIT = 120000;
const SUBMISSION_HINT_LIMIT = 5;

function submission_respond(int $status, array $payload): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function submission_get_json_input(): array {
    $ct = strtolower(trim((string)($_SERVER['CONTENT_TYPE'] ?? '')));
    if (strpos($ct, 'application/json') !== 0) submission_respond(415, ['ok' => false, 'error' => 'content_type_must_be_json']);
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') submission_respond(400, ['ok' => false, 'error' => 'invalid_json']);
    if (strlen($raw) > SUBMISSION_PAYLOAD_LIMIT) submission_respond(413, ['ok' => false, 'error' => 'payload_too_large']);
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) submission_respond(400, ['ok' => false, 'error' => 'invalid_json']);
    return $decoded;
}

function submission_require_method(string $method): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        submission_respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
    }
}

function submission_origin_allowed(): bool {
    $origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin === '') return true;
    $originHost = parse_url($origin, PHP_URL_HOST);
    $serverHost = $_SERVER['HTTP_HOST'] ?? '';
    $serverHost = explode(':', (string)$serverHost)[0];
    return is_string($originHost) && $originHost !== '' && strtolower($originHost) === strtolower($serverHost);
}

function submission_sanitize_text($value, int $maxLen = 1000): string {
    $s = is_string($value) ? trim($value) : '';
    $s = preg_replace('/[\r\n\0\x0B]+/', ' ', $s) ?? '';
    if (mb_strlen($s) > $maxLen) $s = mb_substr($s, 0, $maxLen);
    return $s;
}

function submission_sanitize_email($value): string {
    $raw = submission_sanitize_text($value, 320);
    if ($raw === '') return '';
    if (preg_match('/[\r\n]/', $raw)) return '';
    return filter_var($raw, FILTER_VALIDATE_EMAIL) ? $raw : '';
}

function submission_db(): PDO {
    $dir = dirname(__DIR__) . '/data';
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    $dbPath = $dir . '/submissions.sqlite';
    $pdo = new PDO('sqlite:' . $dbPath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA journal_mode=WAL');
    $pdo->exec('CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        submitter_name TEXT,
        submitter_email TEXT,
        notes TEXT,
        request_ip TEXT,
        request_ua TEXT,
        reviewed_at TEXT,
        review_action TEXT,
        review_meta_json TEXT
    )');
    $pdo->exec('CREATE TABLE IF NOT EXISTS submission_rate_limit (
        key TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL
    )');
    return $pdo;
}

function submission_check_rate_limit(PDO $pdo, string $key, int $max = 20, int $windowSec = 3600): bool {
    $now = time();
    $stmt = $pdo->prepare('SELECT window_start, count FROM submission_rate_limit WHERE key = :key');
    $stmt->execute([':key' => $key]);
    $row = $stmt->fetch();
    if (!$row || ($now - (int)$row['window_start']) > $windowSec) {
        $up = $pdo->prepare('INSERT INTO submission_rate_limit(key, window_start, count) VALUES(:key, :start, 1)
            ON CONFLICT(key) DO UPDATE SET window_start = :start, count = 1');
        $up->execute([':key' => $key, ':start' => $now]);
        return true;
    }
    if ((int)$row['count'] >= $max) return false;
    $up = $pdo->prepare('UPDATE submission_rate_limit SET count = count + 1 WHERE key = :key');
    $up->execute([':key' => $key]);
    return true;
}

function submission_validate_level(array $level): array {
    $required = ['grid','gates','goal','reqLen','reqInt','hints'];
    foreach ($required as $k) if (!array_key_exists($k, $level)) return [false, 'missing_field_' . $k];
    if (!is_array($level['grid']) || !is_numeric($level['grid']['w'] ?? null) || !is_numeric($level['grid']['h'] ?? null)) return [false, 'invalid_grid'];
    if (!is_array($level['hints'])) return [false, 'invalid_hints'];
    if (count($level['hints']) > SUBMISSION_HINT_LIMIT) $level['hints'] = array_slice($level['hints'], 0, SUBMISSION_HINT_LIMIT);
    return [true, null];
}

function submission_send_email_alert(int $id, string $createdAt, array $payload): bool {
    $recipient = getenv('PATHFINDER_SUBMISSION_ALERT_TO') ?: 'ian.wallace@shaw.ca';
    $from = getenv('PATHFINDER_MAIL_FROM') ?: 'noreply@localhost';
    $subject = 'Pathfinder submission #' . $id;
    $name = submission_sanitize_text($payload['submitterName'] ?? '', 120);
    $email = submission_sanitize_email($payload['submitterEmail'] ?? '');
    $notes = submission_sanitize_text($payload['notes'] ?? '', 800);
    $level = $payload['level'] ?? [];
    $body = "New Pathfinder level submission received.\n\n"
        . "Submission ID: {$id}\nCreated UTC: {$createdAt}\n"
        . "Submitter: " . ($name !== '' ? $name : '(none)') . "\n"
        . "Email: " . ($email !== '' ? $email : '(none)') . "\n"
        . "Notes: " . ($notes !== '' ? $notes : '(none)') . "\n"
        . "Grid: " . (($level['grid']['w'] ?? '?') . 'x' . ($level['grid']['h'] ?? '?')) . "\n"
        . "ReqLen/ReqInt: " . (($level['reqLen'] ?? '?') . '/' . ($level['reqInt'] ?? '?')) . "\n";

    $headers = [
        'From: ' . $from,
        'Content-Type: text/plain; charset=UTF-8',
    ];

    $mode = getenv('PATHFINDER_MAIL_MODE') ?: 'mail';
    if ($mode !== 'mail') {
        error_log('PATHFINDER_MAIL_MODE unsupported: ' . $mode);
        return false;
    }
    return @mail($recipient, $subject, $body, implode("\r\n", $headers));
}

function submission_append_level_to_levels_js(array $level): array {
    $path = dirname(__DIR__) . '/levels.js';
    $fh = fopen($path, 'c+');
    if ($fh === false) return [false, 'open_failed'];
    try {
        if (!flock($fh, LOCK_EX)) return [false, 'lock_failed'];
        $content = stream_get_contents($fh);
        if (!is_string($content) || $content === '') return [false, 'read_failed'];
        preg_match_all('/\/\*\s*(\d+)\s*\*\//', $content, $m);
        $maxNum = 0;
        if (!empty($m[1])) {
            foreach ($m[1] as $n) $maxNum = max($maxNum, (int)$n);
        }
        $next = $maxNum + 1;
        $json = json_encode($level, JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) return [false, 'encode_failed'];
        $endPos = strrpos($content, '];');
        if ($endPos === false) return [false, 'levels_format_invalid'];
        $insert = "\n    /* {$next} */ {$json}";
        $newContent = substr($content, 0, $endPos);
        $newContent = rtrim($newContent) . ',' . $insert . "\n" . substr($content, $endPos);
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, $newContent);
        fflush($fh);
        flock($fh, LOCK_UN);
        return [true, $next];
    } finally {
        fclose($fh);
    }
}
