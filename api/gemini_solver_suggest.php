<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

$rawInput = file_get_contents('php://input');
$input = is_string($rawInput) ? json_decode($rawInput, true) : null;
if (!is_array($input)) {
    respond(400, ['ok' => false, 'error' => 'invalid_json']);
}

$secretPath = __DIR__ . '/../includes/secret.php';
$apiKey = @include $secretPath;
if (!is_string($apiKey) || trim($apiKey) === '') {
    respond(500, ['ok' => false, 'error' => 'missing_secret']);
}

$level = $input['level'] ?? null;
if (!is_array($level)) {
    respond(400, ['ok' => false, 'error' => 'missing_level']);
}

$model = (isset($input['model']) && is_string($input['model']) && trim($input['model']) !== '')
    ? trim($input['model'])
    : 'gemini-2.5-flash';
$attempt = isset($input['attempt']) ? (int)$input['attempt'] : 1;
$purpose = isset($input['purpose']) && is_string($input['purpose']) ? trim($input['purpose']) : 'solve';

$rules = [
    'Output ONLY JSON with shape: {"path":[[x,y],...],"notes":"..."}.',
    'Use orthogonal steps only, 1-indexed coordinates.',
    'Path must start at a gate and end at goal.',
    'Satisfy reqLen exactly and reqInt exactly.',
    'Visit all mustCross cells as required by rules.',
    'If a portal is used, represent it as consecutive [entryX,entryY],[destX,destY] coordinates.',
    'No markdown fences, no prose outside JSON.'
];

$prompt = "You are solving a Pathfinder puzzle.\n"
    . "Purpose: {$purpose}, Attempt: {$attempt}.\n"
    . "Rules:\n- " . implode("\n- ", $rules) . "\n\n"
    . "Level JSON:\n" . json_encode($level, JSON_UNESCAPED_UNICODE) . "\n";

$geminiPayload = [
    'contents' => [[
        'role' => 'user',
        'parts' => [['text' => $prompt]],
    ]],
    'generationConfig' => [
        'temperature' => 0.2,
        'responseMimeType' => 'application/json',
    ],
];

$url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent';
$encodedPayload = json_encode($geminiPayload, JSON_UNESCAPED_UNICODE);
if (!is_string($encodedPayload)) {
    respond(400, ['ok' => false, 'error' => 'invalid_request']);
}

$httpStatus = 0;
$responseBody = null;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    if ($ch !== false) {
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'x-goog-api-key: ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => $encodedPayload,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_RETURNTRANSFER => true,
        ]);
        $curlBody = curl_exec($ch);
        $curlErrNo = curl_errno($ch);
        $httpStatus = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($curlErrNo === 0 && is_string($curlBody)) {
            $responseBody = $curlBody;
        }
    }
}

if (!is_string($responseBody)) {
    $headers = [
        'Content-Type: application/json',
        'x-goog-api-key: ' . $apiKey,
    ];
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", $headers),
            'content' => $encodedPayload,
            'timeout' => 15,
            'ignore_errors' => true,
        ],
    ]);
    $streamBody = @file_get_contents($url, false, $context);
    $httpResponseHeader = $http_response_header ?? [];
    if (is_array($httpResponseHeader) && isset($httpResponseHeader[0]) && preg_match('/\s(\d{3})\s/', $httpResponseHeader[0], $m)) {
        $httpStatus = (int)$m[1];
    }
    if ($streamBody !== false) {
        $responseBody = $streamBody;
    }
}

if (!is_string($responseBody)) {
    respond(502, ['ok' => false, 'error' => 'upstream_failed']);
}
if ($httpStatus < 200 || $httpStatus >= 300) {
    respond(502, ['ok' => false, 'error' => 'gemini_error', 'status' => $httpStatus, 'details' => substr($responseBody, 0, 300)]);
}

$decoded = json_decode($responseBody, true);
$text = is_array($decoded) ? ($decoded['candidates'][0]['content']['parts'][0]['text'] ?? null) : null;
if (!is_string($text) || trim($text) === '') {
    respond(200, ['ok' => false, 'error' => 'missing_text']);
}

respond(200, ['ok' => true, 'text' => $text]);
