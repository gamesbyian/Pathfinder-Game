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

function submission_seed_review_fixtures(PDO $pdo): void {
    $fixtures = [
        ['slug' => 'review-seed-2026-03-30-1', 'level' => [
            'grid' => ['w' => 12, 'h' => 12], 'gates' => [['x' => 7, 'y' => 7]], 'goal' => ['x' => 7, 'y' => 10], 'falseGoals' => [],
            'reqLen' => 53, 'reqInt' => 3,
            'blocks' => [['x'=>2,'y'=>2],['x'=>2,'y'=>3],['x'=>2,'y'=>4],['x'=>2,'y'=>5],['x'=>2,'y'=>6],['x'=>2,'y'=>7],['x'=>2,'y'=>8],['x'=>2,'y'=>9],['x'=>2,'y'=>10],['x'=>2,'y'=>11],['x'=>11,'y'=>11],['x'=>11,'y'=>10],['x'=>11,'y'=>9],['x'=>11,'y'=>8],['x'=>11,'y'=>7],['x'=>11,'y'=>6],['x'=>11,'y'=>5],['x'=>11,'y'=>4],['x'=>11,'y'=>3],['x'=>11,'y'=>2],['x'=>3,'y'=>2],['x'=>4,'y'=>2],['x'=>5,'y'=>2],['x'=>6,'y'=>2],['x'=>8,'y'=>2],['x'=>7,'y'=>2],['x'=>9,'y'=>2],['x'=>10,'y'=>2],['x'=>3,'y'=>11],['x'=>5,'y'=>11],['x'=>4,'y'=>11],['x'=>6,'y'=>11],['x'=>8,'y'=>11],['x'=>9,'y'=>11],['x'=>10,'y'=>11],['x'=>7,'y'=>11],['x'=>8,'y'=>8],['x'=>5,'y'=>5],['x'=>6,'y'=>5],['x'=>7,'y'=>5],['x'=>8,'y'=>5],['x'=>8,'y'=>6],['x'=>8,'y'=>7],['x'=>7,'y'=>8],['x'=>6,'y'=>8],['x'=>5,'y'=>8],['x'=>5,'y'=>6],['x'=>5,'y'=>7]],
            'mustPass' => [['x'=>10,'y'=>3],['x'=>5,'y'=>9]], 'mustCross' => [['x'=>4,'y'=>4],['x'=>9,'y'=>9]],
            'filters' => [], 'flippingFilters' => [['x'=>6,'y'=>4,'axis'=>1],['x'=>8,'y'=>9,'axis'=>2]],
            'portals' => [['x1'=>6,'y1'=>6,'x2'=>6,'y2'=>1,'color'=>'#d946ef'],['x1'=>12,'y1'=>9,'x2'=>3,'y2'=>9,'color'=>'#0ea5e9'],['x1'=>1,'y1'=>5,'x2'=>10,'y2'=>6,'color'=>'#10b981']],
            'geese' => [['x'=>1,'y'=>2],['x'=>3,'y'=>8],['x'=>4,'y'=>6]],
            'hints' => [[393222,327686,327685,5,6,7,8,9,10,11,65547,131083,196619,262155,327691,393227,458763,524299,524290,524291,458755,393219,393218,327682,262146,262147,196611,131075,131074,196610,196611,196612,196613,196614,196615,196616,196617,131081,131080,196616,262152,327688,393224,458760,524296,589832,589833,524297,524296,524295,524294,524293,524292,589828,589829,589830]],
        ]],
        ['slug' => 'review-seed-2026-03-30-2', 'level' => [
            'grid' => ['w' => 7, 'h' => 7], 'gates' => [['x' => 2, 'y' => 2]], 'goal' => ['x' => 6, 'y' => 6], 'falseGoals' => [],
            'reqLen' => 27, 'reqInt' => 0,
            'blocks' => [['x'=>4,'y'=>1],['x'=>4,'y'=>2],['x'=>4,'y'=>3],['x'=>4,'y'=>4],['x'=>4,'y'=>5],['x'=>4,'y'=>6],['x'=>4,'y'=>7],['x'=>1,'y'=>4],['x'=>2,'y'=>4],['x'=>3,'y'=>4],['x'=>5,'y'=>4],['x'=>6,'y'=>4],['x'=>7,'y'=>4]],
            'mustPass' => [['x'=>1,'y'=>1],['x'=>3,'y'=>5]], 'mustCross' => [], 'filters' => [], 'flippingFilters' => [],
            'portals' => [['x1'=>3,'y1'=>3,'x2'=>7,'y2'=>1,'color'=>'#d946ef'],['x1'=>5,'y1'=>3,'x2'=>1,'y2'=>7,'color'=>'#0ea5e9'],['x1'=>2,'y1'=>5,'x2'=>7,'y2'=>7,'color'=>'#10b981']],
            'geese' => [['x'=>3,'y'=>2],['x'=>3,'y'=>7]],
            'hints' => [[65537,1,0,65536,131072,131073,131074,6,5,4,65540,65541,65542,131078,131077,131076,393216,393217,327681,327682,262146,262145,393222,393221,393220,327684,262148,262149,262150,327686,327685]],
        ]],
        ['slug' => 'review-seed-2026-03-30-3', 'level' => [
            'grid' => ['w' => 10, 'h' => 10], 'gates' => [['x' => 3, 'y' => 5]], 'goal' => ['x' => 4, 'y' => 3], 'falseGoals' => [['x' => 3, 'y' => 6]],
            'reqLen' => 29, 'reqInt' => 6, 'blocks' => [], 'mustPass' => [],
            'mustCross' => [['x'=>4,'y'=>5],['x'=>5,'y'=>4],['x'=>6,'y'=>5],['x'=>5,'y'=>6]],
            'filters' => [], 'flippingFilters' => [], 'portals' => [], 'geese' => [],
            'hints' => [[262146,262147,262148,262149,262150,196614,131078,131077,131076,196612,262148,327684,393220,393219,393218,393217,327681,262145,196609,196610,196611,196612,196613,262149,327685,327684,327683,262147,196611,131075]],
        ]],
        ['slug' => 'review-seed-2026-03-30-4', 'level' => [
            'grid' => ['w' => 8, 'h' => 8], 'gates' => [['x' => 5, 'y' => 1]], 'goal' => ['x' => 3, 'y' => 1], 'falseGoals' => [],
            'reqLen' => 38, 'reqInt' => 1,
            'blocks' => [['x'=>4,'y'=>4],['x'=>6,'y'=>4],['x'=>2,'y'=>4],['x'=>3,'y'=>6],['x'=>5,'y'=>6]],
            'mustPass' => [['x'=>4,'y'=>3]], 'mustCross' => [['x'=>5,'y'=>3]], 'filters' => [], 'flippingFilters' => [], 'portals' => [], 'geese' => [],
            'hints' => [[4,65540,131076,196612,262148,262149,327685,393221,393220,393219,327683,262147,262146,196610,131074,131073,131072,196608,262144,262145,327681,393217,393218,458754,458755,458756,458757,458758,393222,327686,262150,196614,131078,131077,131076,131075,65539,3,2],[4,65540,131076,196612,262148,262149,327685,393221,393220,393219,327683,262147,262146,196610,131074,131073,131072,196608,262144,262145,327681,393217,393218,458754,458755,458756,458757,458758,393222,327686,262150,196614,131078,131077,131076,131075,65539,3,2]],
        ]],
    ];

    $existsStmt = $pdo->prepare('SELECT 1 FROM submissions WHERE notes = :notes LIMIT 1');
    $insertStmt = $pdo->prepare('INSERT INTO submissions(created_at, status, payload_json, submitter_name, submitter_email, notes, request_ip, request_ua) VALUES(:created_at, "pending", :payload_json, :submitter_name, :submitter_email, :notes, :request_ip, :request_ua)');
    foreach ($fixtures as $fixture) {
        $marker = '[seed-fixture] ' . $fixture['slug'];
        $existsStmt->execute([':notes' => $marker]);
        if ($existsStmt->fetch()) continue;
        $payload = [
            'submitterName' => 'Review Fixture',
            'submitterEmail' => '',
            'notes' => $marker,
            'level' => $fixture['level'],
        ];
        $insertStmt->execute([
            ':created_at' => gmdate('c'),
            ':payload_json' => json_encode($payload, JSON_UNESCAPED_UNICODE),
            ':submitter_name' => 'Review Fixture',
            ':submitter_email' => '',
            ':notes' => $marker,
            ':request_ip' => '127.0.0.1',
            ':request_ua' => 'review-fixture-seed',
        ]);
    }
}


function submission_extract_level_from_payload($payload): ?array {
    if (!is_array($payload)) return null;

    $looksLikeRawLevel = static function ($candidate): bool {
        return is_array($candidate)
            && isset($candidate['grid'], $candidate['gates'], $candidate['goal'])
            && is_array($candidate['grid'])
            && is_array($candidate['gates']);
    };

    if (isset($payload['level'])) {
        if (is_array($payload['level'])) {
            return $payload['level'];
        }
        if (is_string($payload['level'])) {
            $decoded = json_decode($payload['level'], true);
            if (is_array($decoded)) return $decoded;
        }
    }

    if ($looksLikeRawLevel($payload)) {
        // Backward compatibility: some rows stored only the raw level object.
        return $payload;
    }

    return null;
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
