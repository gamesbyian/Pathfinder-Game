<?php
declare(strict_types=1);
require_once __DIR__ . '/submissions_lib.php';

if (!submission_origin_allowed()) {
    submission_respond(403, ['ok' => false, 'error' => 'origin_not_allowed']);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$pdo = submission_db();
submission_seed_review_fixtures($pdo);
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
if (!submission_check_rate_limit($pdo, 'review:' . $ip, 240, 3600)) {
    submission_respond(429, ['ok' => false, 'error' => 'rate_limited']);
}

if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id > 0) {
        $stmt = $pdo->prepare('SELECT * FROM submissions WHERE id = :id AND status = "pending"');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        if (!$row) submission_respond(404, ['ok' => false, 'error' => 'not_found']);
        submission_respond(200, ['ok' => true, 'submission' => submission_map_row($row)]);
    }
    $rows = $pdo->query('SELECT * FROM submissions WHERE status = "pending" ORDER BY created_at ASC')->fetchAll();
    $items = array_map('submission_map_row', $rows ?: []);
    submission_respond(200, ['ok' => true, 'items' => $items]);
}

if ($method !== 'POST') {
    submission_respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

$input = submission_get_json_input();
$action = (string)($input['action'] ?? '');
$id = (int)($input['submissionId'] ?? 0);
if ($id <= 0) submission_respond(400, ['ok' => false, 'error' => 'missing_submission_id']);

$stmt = $pdo->prepare('SELECT * FROM submissions WHERE id = :id AND status = "pending"');
$stmt->execute([':id' => $id]);
$row = $stmt->fetch();
if (!$row) submission_respond(404, ['ok' => false, 'error' => 'not_found_or_already_reviewed']);

if ($action === 'reject') {
    $meta = ['reviewedAt' => gmdate('c'), 'reviewerIp' => $ip, 'action' => 'reject'];
    $up = $pdo->prepare('UPDATE submissions SET status = "rejected", reviewed_at = :reviewed_at, review_action = "reject", review_meta_json = :meta WHERE id = :id AND status = "pending"');
    $up->execute([':reviewed_at' => $meta['reviewedAt'], ':meta' => json_encode($meta, JSON_UNESCAPED_UNICODE), ':id' => $id]);
    submission_respond(200, ['ok' => true, 'status' => 'rejected', 'submissionId' => $id]);
}

if ($action === 'approve') {
    $level = $input['level'] ?? null;
    if (!is_array($level)) submission_respond(400, ['ok' => false, 'error' => 'missing_level']);
    [$ok, $err] = submission_validate_level($level);
    if (!$ok) submission_respond(400, ['ok' => false, 'error' => $err]);
    [$appendOk, $appendInfo] = submission_append_level_to_levels_js($level);
    if (!$appendOk) submission_respond(500, ['ok' => false, 'error' => 'approve_failed', 'detail' => $appendInfo]);
    $meta = ['reviewedAt' => gmdate('c'), 'reviewerIp' => $ip, 'action' => 'approve', 'levelNumber' => $appendInfo];
    $up = $pdo->prepare('UPDATE submissions SET status = "approved", reviewed_at = :reviewed_at, review_action = "approve", review_meta_json = :meta WHERE id = :id AND status = "pending"');
    $up->execute([':reviewed_at' => $meta['reviewedAt'], ':meta' => json_encode($meta, JSON_UNESCAPED_UNICODE), ':id' => $id]);
    submission_respond(200, ['ok' => true, 'status' => 'approved', 'submissionId' => $id, 'levelNumber' => $appendInfo]);
}

if ($action === 'update_draft') {
    $level = $input['level'] ?? null;
    if (!is_array($level)) submission_respond(400, ['ok' => false, 'error' => 'missing_level']);
    $payload = json_decode((string)$row['payload_json'], true);
    if (!is_array($payload)) $payload = [];
    $payload['level'] = $level;
    $up = $pdo->prepare('UPDATE submissions SET payload_json = :payload WHERE id = :id AND status = "pending"');
    $up->execute([':payload' => json_encode($payload, JSON_UNESCAPED_UNICODE), ':id' => $id]);
    submission_respond(200, ['ok' => true, 'status' => 'pending', 'submissionId' => $id]);
}

submission_respond(400, ['ok' => false, 'error' => 'invalid_action']);

function submission_map_row(array $row): array {
    $payload = json_decode((string)$row['payload_json'], true);
    if (!is_array($payload)) $payload = [];
    return [
        'id' => (int)$row['id'],
        'createdAt' => $row['created_at'],
        'status' => $row['status'],
        'submitterName' => $row['submitter_name'],
        'submitterEmail' => $row['submitter_email'],
        'notes' => $row['notes'],
        'level' => $payload['level'] ?? null,
        'payload' => $payload,
    ];
}
