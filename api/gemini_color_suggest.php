<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function detectSameOriginMismatch(): bool {
    if (empty($_SERVER['HTTP_ORIGIN'])) {
        return false;
    }
    $originHost = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
    $hostHeader = $_SERVER['HTTP_HOST'] ?? '';
    $serverHost = explode(':', $hostHeader)[0];
    return !$originHost || !$serverHost || strcasecmp((string)$originHost, (string)$serverHost) !== 0;
}

function enforceRateLimit(int $maxRequests, int $windowSeconds): bool {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = preg_replace('/[^a-zA-Z0-9_.:-]/', '_', (string)$ip);
    $file = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'pf_gemini_rl_' . $key . '.json';

    $now = time();
    $state = ['start' => $now, 'count' => 0];

    if (is_file($file)) {
        $raw = @file_get_contents($file);
        $decoded = json_decode((string)$raw, true);
        if (is_array($decoded) && isset($decoded['start'], $decoded['count'])) {
            $state['start'] = (int)$decoded['start'];
            $state['count'] = (int)$decoded['count'];
        }
    }

    if (($now - $state['start']) > $windowSeconds) {
        $state = ['start' => $now, 'count' => 0];
    }

    $state['count']++;
    @file_put_contents($file, json_encode($state));

    return $state['count'] <= $maxRequests;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

if (detectSameOriginMismatch()) {
    respond(403, ['ok' => false, 'error' => 'forbidden_origin']);
}

if (!enforceRateLimit(30, 300)) {
    respond(429, ['ok' => false, 'error' => 'rate_limited']);
}

$rawInput = file_get_contents('php://input');
if ($rawInput === false || trim($rawInput) === '') {
    respond(400, ['ok' => false, 'error' => 'invalid_json']);
}

$input = json_decode($rawInput, true);
if (!is_array($input)) {
    respond(400, ['ok' => false, 'error' => 'invalid_json']);
}

$apiKey = require __DIR__ . '/../includes/secret.php';
if (!is_string($apiKey) || trim($apiKey) === '') {
    respond(500, ['ok' => false, 'error' => 'server_misconfigured']);
}

$model = isset($input['model']) && is_string($input['model']) && trim($input['model']) !== ''
    ? trim($input['model'])
    : 'gemini-2.5-flash';

if (isset($input['geminiRequest'])) {
    if (!is_array($input['geminiRequest'])) {
        respond(400, ['ok' => false, 'error' => 'invalid_gemini_request']);
    }
    $geminiPayload = $input['geminiRequest'];
} else {
    $prompt = isset($input['prompt']) && is_string($input['prompt']) ? trim($input['prompt']) : '';
    if ($prompt === '') {
        respond(400, ['ok' => false, 'error' => 'missing_prompt']);
    }

    $geminiPayload = [
        'contents' => [[
            'role' => 'user',
            'parts' => [['text' => $prompt]],
        ]],
    ];

    if (isset($input['generationConfig']) && is_array($input['generationConfig'])) {
        $geminiPayload['generationConfig'] = $input['generationConfig'];
    }
}

$url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent';

$ch = curl_init($url);
if ($ch === false) {
    respond(502, ['ok' => false, 'error' => 'upstream_failed']);
}

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-goog-api-key: ' . $apiKey,
    ],
    CURLOPT_POSTFIELDS => json_encode($geminiPayload, JSON_UNESCAPED_UNICODE),
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_RETURNTRANSFER => true,
]);

$responseBody = curl_exec($ch);
$curlErrNo = curl_errno($ch);
$httpStatus = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($curlErrNo !== 0 || $responseBody === false) {
    respond(502, ['ok' => false, 'error' => 'upstream_failed']);
}

$decoded = json_decode($responseBody, true);
if ($httpStatus < 200 || $httpStatus >= 300) {
    $snippet = substr(is_string($responseBody) ? $responseBody : '', 0, 300);
    respond(502, [
        'ok' => false,
        'error' => 'gemini_error',
        'status' => $httpStatus,
        'details' => $snippet,
    ]);
}

$text = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? null;
if (!is_string($text) || trim($text) === '') {
    respond(200, ['ok' => false, 'error' => 'missing_text']);
}

respond(200, [
    'ok' => true,
    'text' => $text,
    'raw' => $decoded,
]);
