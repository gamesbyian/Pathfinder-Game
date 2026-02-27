<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function getHostOnly(string $value): string
{
    $trimmed = trim($value);
    if ($trimmed === '') {
        return '';
    }

    $parsedHost = parse_url($trimmed, PHP_URL_HOST);
    if (is_string($parsedHost) && $parsedHost !== '') {
        return strtolower($parsedHost);
    }

    $hostPort = explode(':', $trimmed)[0] ?? '';
    return strtolower(trim($hostPort));
}

function isDebugAllowed(): bool
{
    if (($_GET['debug'] ?? '') !== '1') {
        return false;
    }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $originHost = getHostOnly((string)$origin);
    $serverHost = getHostOnly((string)($_SERVER['HTTP_HOST'] ?? ''));

    return $originHost !== '' && $serverHost !== '' && $originHost === $serverHost;
}

$debugEnabled = isDebugAllowed();
$debug = [
    'php_has_curl' => function_exists('curl_init'),
    'allow_url_fopen' => filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN),
    'transport' => null,
    'transport_error' => null,
    'upstream_http_status' => null,
];

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    $payload = ['ok' => false, 'error' => 'method_not_allowed'];
    if ($debugEnabled) {
        $payload['debug'] = $debug;
    }
    respond(405, $payload);
}

$rawInput = file_get_contents('php://input');
if ($rawInput === false || trim($rawInput) === '') {
    $payload = ['ok' => false, 'error' => 'invalid_json'];
    if ($debugEnabled) {
        $payload['debug'] = $debug;
    }
    respond(400, $payload);
}

$input = json_decode($rawInput, true);
if (!is_array($input)) {
    $payload = ['ok' => false, 'error' => 'invalid_json'];
    if ($debugEnabled) {
        $payload['debug'] = $debug;
    }
    respond(400, $payload);
}

$secretPath = __DIR__ . '/../includes/secret.php';
if (!is_file($secretPath) || !is_readable($secretPath)) {
    $payload = ['ok' => false, 'error' => 'missing_secret'];
    if ($debugEnabled) {
        $payload['debug'] = $debug;
        $payload['secret_path'] = $secretPath;
    }
    respond(500, $payload);
}

$apiKey = @include $secretPath;
if (!is_string($apiKey) || trim($apiKey) === '') {
    $payload = ['ok' => false, 'error' => 'missing_secret'];
    if ($debugEnabled) {
        $payload['debug'] = $debug;
        $payload['secret_path'] = $secretPath;
    }
    respond(500, $payload);
}

$model = isset($input['model']) && is_string($input['model']) && trim($input['model']) !== ''
    ? trim($input['model'])
    : 'gemini-2.5-flash';

if (array_key_exists('geminiRequest', $input)) {
    if (!is_array($input['geminiRequest'])) {
        $payload = ['ok' => false, 'error' => 'invalid_gemini_request'];
        if ($debugEnabled) {
            $payload['debug'] = $debug;
        }
        respond(400, $payload);
    }
    $geminiPayload = $input['geminiRequest'];
} else {
    $prompt = isset($input['prompt']) && is_string($input['prompt']) ? trim($input['prompt']) : '';
    if ($prompt === '') {
        $payload = ['ok' => false, 'error' => 'missing_prompt'];
        if ($debugEnabled) {
            $payload['debug'] = $debug;
        }
        respond(400, $payload);
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
    if (isset($input['systemInstruction']) && is_array($input['systemInstruction'])) {
        $geminiPayload['systemInstruction'] = $input['systemInstruction'];
    }
}

$url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent';
$encodedPayload = json_encode($geminiPayload, JSON_UNESCAPED_UNICODE);
if (!is_string($encodedPayload)) {
    $payload = ['ok' => false, 'error' => 'invalid_gemini_request'];
    if ($debugEnabled) {
        $payload['debug'] = $debug;
    }
    respond(400, $payload);
}

$httpStatus = 0;
$responseBody = null;

if (function_exists('curl_init')) {
    $debug['transport'] = 'curl';
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
        $curlError = curl_error($ch);
        $httpStatus = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($curlErrNo === 0 && is_string($curlBody)) {
            $responseBody = $curlBody;
        } else {
            $debug['transport_error'] = $curlError !== '' ? $curlError : 'curl_exec_failed';
            $httpStatus = 0;
        }
    } else {
        $debug['transport_error'] = 'curl_init_failed';
    }
}

if (!is_string($responseBody)) {
    if ($debug['transport'] === null) {
        $debug['transport'] = 'stream';
    } else {
        $debug['transport'] = 'stream_fallback';
    }

    $allowUrlFopen = filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN);
    if ($allowUrlFopen) {
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
        } else {
            $debug['transport_error'] = ($debug['transport_error'] ? $debug['transport_error'] . '; ' : '') . 'stream_request_failed';
        }
    } else {
        $debug['transport_error'] = ($debug['transport_error'] ? $debug['transport_error'] . '; ' : '') . 'allow_url_fopen_disabled';
    }
}

$debug['upstream_http_status'] = $httpStatus;

if (!is_string($responseBody)) {
    $payload = ['ok' => false, 'error' => 'upstream_failed'];
    if ($debugEnabled) {
        $payload['debug'] = $debug;
    }
    respond(502, $payload);
}

if ($httpStatus < 200 || $httpStatus >= 300) {
    $payload = [
        'ok' => false,
        'error' => 'gemini_error',
        'status' => $httpStatus,
        'details' => substr($responseBody, 0, 300),
    ];
    if ($debugEnabled) {
        $payload['debug'] = $debug;
    }
    respond(502, $payload);
}

$decoded = json_decode($responseBody, true);
if (!is_array($decoded)) {
    $payload = [
        'ok' => false,
        'error' => 'invalid_upstream_json',
        'details' => substr($responseBody, 0, 300),
    ];
    if ($debugEnabled) {
        $payload['debug'] = $debug;
    }
    respond(502, $payload);
}

$text = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? null;
if (!is_string($text) || trim($text) === '') {
    $payload = ['ok' => false, 'error' => 'missing_text'];
    if ($debugEnabled) {
        $payload['debug'] = $debug;
        $payload['raw'] = $decoded;
    }
    respond(200, $payload);
}

$payload = [
    'ok' => true,
    'text' => $text,
];
if ($debugEnabled) {
    $payload['debug'] = $debug;
}
respond(200, $payload);
