<?php
namespace App\Controllers;

use App\Services\ItRequestService;
use App\Middlewares\AuthMiddleware;
use Exception;

/**
 * Class ItRequestController
 * Handles request actions for IT Request Management API.
 */
class ItRequestController {
    private ItRequestService $service;

    public function __construct() {
        $this->service = new ItRequestService();
    }

    /**
     * GET /api/requests
     */
    public function index() {
        $token = AuthMiddleware::handle();
        $user = $token['user'];

        // Get user permissions
        $perms = $this->service->getUserPermissions($user['id']);
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;

        try {
            if ($perms['can_it'] || $perms['can_management']) {
                // IT and management can view all requests
                $data = $this->service->getAllRequests($status, $search);
            } else {
                // Regular staff can only view their own requests
                $data = $this->service->getMyRequests($user['id']);
            }
            echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * POST /api/requests
     */
    public function create() {
        $token = AuthMiddleware::handle();
        $user = $token['user'];

        // Check permission
        $perms = $this->service->getUserPermissions($user['id']);
        if (!$perms['can_submit']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'คุณไม่มีสิทธิ์ส่งคำร้องไอที'], JSON_UNESCAPED_UNICODE);
            return;
        }

        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $url = trim($_POST['url'] ?? '');

        if ($title === '' || $description === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'กรุณากรอกหัวข้อและรายละเอียดให้ครบถ้วน'], JSON_UNESCAPED_UNICODE);
            return;
        }

        try {
            // Upload files from $_FILES
            $result = $this->service->createRequest($user['id'], $title, $description, $url ?: null, $_FILES['files'] ?? []);
            echo json_encode(['success' => true, 'message' => 'ส่งคำร้องไอทีสำเร็จ', 'data' => $result], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * GET /api/requests/{id}
     */
    public function show(int $id) {
        $token = AuthMiddleware::handle();
        $user = $token['user'];

        $perms = $this->service->getUserPermissions($user['id']);

        try {
            $request = $this->service->getRequest($id);
            if (!$request) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'ไม่พบคำร้อง'], JSON_UNESCAPED_UNICODE);
                return;
            }

            // Check if user owns it or has view rights
            if (!$perms['can_it'] && !$perms['can_management'] && (int)$request['user_id'] !== (int)$user['id']) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'คุณไม่มีสิทธิ์เข้าถึงคำร้องนี้'], JSON_UNESCAPED_UNICODE);
                return;
            }

            // Load updates log and files
            $files = $this->service->getRequestFiles($id);
            $updates = $this->service->getRequestUpdates($id);

            echo json_encode([
                'success' => true,
                'data' => [
                    'request' => $request,
                    'files' => $files,
                    'updates' => $updates
                ]
            ], JSON_UNESCAPED_UNICODE);

        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * POST /api/requests/{id}/claim
     */
    public function claim(int $id) {
        $token = AuthMiddleware::handle();
        $user = $token['user'];

        $perms = $this->service->getUserPermissions($user['id']);
        if (!$perms['can_it']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'เฉพาะเจ้าหน้าที่ไอทีเท่านั้นที่สามารถรับงานได้'], JSON_UNESCAPED_UNICODE);
            return;
        }

        try {
            $claimed = $this->service->claimRequest($id, $user['id']);
            echo json_encode(['success' => $claimed, 'message' => 'รับงานเรียบร้อยแล้ว'], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * POST /api/requests/{id}/status
     */
    public function status(int $id) {
        $token = AuthMiddleware::handle();
        $user = $token['user'];

        $perms = $this->service->getUserPermissions($user['id']);
        if (!$perms['can_it']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'เฉพาะเจ้าหน้าที่ไอทีเท่านั้นที่สามารถอัปเดตสถานะได้'], JSON_UNESCAPED_UNICODE);
            return;
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $status = $body['status'] ?? '';
        $note = trim($body['note'] ?? '');

        $allowedStatuses = ['pending', 'in_progress', 'completed', 'rejected'];
        if (!in_array($status, $allowedStatuses, true)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'สถานะไม่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
            return;
        }

        try {
            $updated = $this->service->updateStatus($id, $status, $user['id'], $note ?: null);
            echo json_encode(['success' => $updated, 'message' => 'อัปเดตสถานะเรียบร้อยแล้ว'], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * POST /api/requests/{id}/disburse
     */
    public function disburse(int $id) {
        $token = AuthMiddleware::handle();
        $user = $token['user'];

        $perms = $this->service->getUserPermissions($user['id']);
        if (!$perms['can_management']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'เฉพาะฝ่ายบริหารเท่านั้นที่สามารถอนุมัติเบิกจ่ายได้'], JSON_UNESCAPED_UNICODE);
            return;
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $isDisbursed = filter_var($body['is_disbursed'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $note = trim($body['note'] ?? '');

        try {
            $updated = $this->service->toggleDisburse($id, $user['id'], $isDisbursed, $note ?: null);
            echo json_encode(['success' => $updated, 'message' => 'บันทึกการเบิกจ่ายเสร็จสิ้น'], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * GET /api/stats
     */
    public function stats() {
        AuthMiddleware::handle();

        try {
            $stats = $this->service->getDashboardStats();
            echo json_encode(['success' => true, 'data' => $stats], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * GET /api/permissions
     */
    public function permissions() {
        $token = AuthMiddleware::handle();
        $user = $token['user'];

        $perms = $this->service->getUserPermissions($user['id']);
        if (!$perms['can_manage_permissions']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'คุณไม่มีสิทธิ์จัดการสิทธิ์ผู้ใช้งาน'], JSON_UNESCAPED_UNICODE);
            return;
        }

        try {
            $list = $this->service->getAllUsersPermissions();
            echo json_encode(['success' => true, 'data' => $list], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * POST /api/permissions
     */
    public function updatePermission() {
        $token = AuthMiddleware::handle();
        $user = $token['user'];
        $userId = is_array($user) ? (int)$user['id'] : (int)$user->id;

        $perms = $this->service->getUserPermissions($userId);
        if (!$perms['can_manage_permissions']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'คุณไม่มีสิทธิ์จัดการสิทธิ์ผู้ใช้งาน'], JSON_UNESCAPED_UNICODE);
            return;
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $targetUserId = (int)($body['user_id'] ?? 0);
        $userPerms = $body['permissions'] ?? $body;

        if ($targetUserId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID ผู้ใช้งานไม่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
            return;
        }

        try {
            $updated = $this->service->updatePermission($targetUserId, $userPerms);
            echo json_encode(['success' => $updated, 'message' => 'อัปเดตสิทธิ์การใช้งานเรียบร้อยแล้ว'], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * GET /api/export
     */
    public function export() {
        $token = AuthMiddleware::handle();
        $user = $token['user'];
        $userId = is_array($user) ? (int)$user['id'] : (int)$user->id;
        $userNameTh = is_array($user) ? ($user['name_th'] ?? '') : ($user->name_th ?? '');
        $username = is_array($user) ? ($user['username'] ?? '') : ($user->username ?? '');

        $perms = $this->service->getUserPermissions($userId);
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;

        try {
            if ($perms['can_it'] || $perms['can_management']) {
                $items = $this->service->getAllRequests($status, $search);
            } else {
                $items = $this->service->getMyRequests($userId);
            }

            $filename = "it_requests_export_" . date("Ymd_His") . ".csv";

            header("Content-Type: text/csv; charset=UTF-8");
            header("Content-Disposition: attachment; filename=\"{$filename}\"");
            header("Pragma: no-cache");
            header("Expires: 0");

            $output = fopen("php://output", "w");
            fwrite($output, "\xEF\xBB\xBF"); // UTF-8 BOM

            fputcsv($output, [
                "ID",
                "ผู้ส่งคำร้อง",
                "หัวข้อ",
                "รายละเอียด",
                "ลิงก์อ้างอิง",
                "สถานะ",
                "การเบิกเงินจ่าย",
                "ผู้รับผิดชอบ (IT)",
                "วันที่ส่งคำร้อง"
            ]);

            foreach ($items as $item) {
                fputcsv($output, [
                    $item['id'],
                    $item['requester_name_th'] ?? $userNameTh ?? $username,
                    $item['title'],
                    $item['description'],
                    $item['url'] ?? '-',
                    $item['status'],
                    $item['is_disbursed'] ? 'เบิกแล้ว' : 'ยังไม่เบิก',
                    $item['assigned_name_th'] ?? '-',
                    $item['created_at']
                ]);
            }

            fclose($output);
            exit;

        } catch (Exception $e) {
            http_response_code(400);
            header("Content-Type: application/json; charset=utf-8");
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * GET /api/requests/my
     */
    public function myRequests() {
        $token = AuthMiddleware::handle();
        $user = $token['user'];
        $userId = is_array($user) ? (int)$user['id'] : (int)$user->id;

        try {
            $data = $this->service->getMyRequests($userId);
            echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * GET /api/requests/my/{id}
     */
    public function mySingleRequest(int $id) {
        $token = AuthMiddleware::handle();
        $user = $token['user'];
        $userId = is_array($user) ? (int)$user['id'] : (int)$user->id;

        try {
            $request = $this->service->getRequest($id, $userId);
            if (!$request) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'ไม่พบคำร้อง'], JSON_UNESCAPED_UNICODE);
                return;
            }

            $files = $this->service->getRequestFiles($id);
            $updates = $this->service->getRequestUpdates($id);

            echo json_encode([
                'success' => true,
                'data' => [
                    'request' => $request,
                    'files' => $files,
                    'updates' => $updates
                ]
            ], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * GET /api/my-tasks
     */
    public function myTasks() {
        $token = AuthMiddleware::handle();
        $user = $token['user'];
        $userId = is_array($user) ? (int)$user['id'] : (int)$user->id;

        $perms = $this->service->getUserPermissions($userId);
        if (!$perms['can_it']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้'], JSON_UNESCAPED_UNICODE);
            return;
        }

        try {
            $tasks = $this->service->getMyTasks($userId);
            $stats = $this->service->getMyTaskStats($userId);
            echo json_encode([
                'success' => true,
                'data' => $tasks,
                'stats' => $stats
            ], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * GET /api/files/{id}/download
     */
    public function downloadFile(int $fileId) {
        AuthMiddleware::handle();

        try {
            $file = $this->service->getFile($fileId);
            if (!$file) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'ไม่พบไฟล์'], JSON_UNESCAPED_UNICODE);
                return;
            }

            $fullPath = __DIR__ . '/../../' . $file['file_path'];
            if (!file_exists($fullPath)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'ไฟล์ไม่พบบน Server'], JSON_UNESCAPED_UNICODE);
                return;
            }

            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . $file['file_name'] . '"');
            header('Content-Length: ' . filesize($fullPath));
            header('Content-Type: ' . ($file['file_type'] ?: 'application/octet-stream'));
            readfile($fullPath);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'เกิดข้อผิดพลาดในการโหลดไฟล์: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }
}
