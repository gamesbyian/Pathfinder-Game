<?php
declare(strict_types=1);
require_once __DIR__ . '/submissions_lib.php';

if (!submission_origin_allowed()) {
    submission_respond(403, ['ok' => false, 'error' => 'origin_not_allowed']);
}
submission_require_method('POST');
$input = submission_get_json_input();

$ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$ua = submission_sanitize_text($_SERVER['HTTP_USER_AGENT'] ?? '', 400);

$pdo = submission_db();
if (!submission_check_rate_limit($pdo, 'submit:' . $ip, 30, 3600)) {
    submission_respond(429, ['ok' => false, 'error' => 'rate_limited']);
}

$level = $input['level'] ?? null;
if (!is_array($level)) submission_respond(400, ['ok' => false, 'error' => 'missing_level']);
[$ok, $err] = submission_validate_level($level);
if (!$ok) submission_respond(400, ['ok' => false, 'error' => $err]);

$name = submission_sanitize_text($input['submitterName'] ?? '', 120);
$email = submission_sanitize_email($input['submitterEmail'] ?? '');
$notes = submission_sanitize_text($input['notes'] ?? '', 2000);
$createdAt = gmdate('c');

$stmt = $pdo->prepare('INSERT INTO submissions(created_at, status, payload_json, submitter_name, submitter_email, notes, request_ip, request_ua)
VALUES(:created_at, :status, :payload_json, :name, :email, :notes, :ip, :ua)');
$stmt->execute([
    ':created_at' => $createdAt,
    ':status' => 'pending',
    ':payload_json' => json_encode($input, JSON_UNESCAPED_UNICODE),
    ':name' => $name,
    ':email' => $email,
    ':notes' => $notes,
    ':ip' => $ip,
    ':ua' => $ua,
]);
$submissionId = (int)$pdo->lastInsertId();

$emailNotified = submission_send_email_alert($submissionId, $createdAt, $input);
if (!$emailNotified) {
    error_log('Submission email notification failed for id=' . $submissionId);
}

submission_respond(200, [
    'ok' => true,
    'submissionId' => $submissionId,
    'createdAt' => $createdAt,
    'emailNotified' => $emailNotified,
]);
