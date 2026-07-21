<?php
namespace App\Services;

use App\Config\Database;
use PDO;
use Exception;

/**
 * Class ItRequestService
 * Business Logic and Database Layer for managing IT Requests.
 */
class ItRequestService {
    private PDO $pdo;

    public function __construct() {
        $this->pdo = Database::getConnection();
    }

    /**
     * Create a new request
     */
    public function createRequest(int $userId, string $title, string $description, ?string $url, array $files = []): array {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO it_requests (user_id, title, description, url, created_at)
                VALUES (?, ?, ?, ?, NOW())
            ");
            $stmt->execute([$userId, $title, $description, $url]);
            $requestId = (int)$this->pdo->lastInsertId();

            // Handle file uploads
            $uploadedFiles = [];
            if (!empty($files) && !empty($files['name'])) {
                $uploadedFiles = $this->handleFileUploads($requestId, $files);
            }

            $this->pdo->commit();
            return ['success' => true, 'request_id' => $requestId, 'files' => $uploadedFiles];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Handle file uploads securely
     */
    private function handleFileUploads(int $requestId, array $files): array {
        $maxSize = intval(getenv('MAX_FILE_SIZE') ?: 10485760);
        $maxFiles = intval(getenv('MAX_FILES_PER_REQUEST') ?: 5);
        $forbidden = ['exe', 'bat', 'sh', 'cmd', 'com', 'vbs', 'js', 'msi'];

        $uploadDir = __DIR__ . '/../../uploads/it_requests/' . $requestId;
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $uploaded = [];
        $count = 0;

        $fileCount = is_array($files['name']) ? count($files['name']) : 1;
        
        for ($i = 0; $i < $fileCount && $count < $maxFiles; $i++) {
            $name = is_array($files['name']) ? $files['name'][$i] : $files['name'];
            $tmpName = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
            $size = is_array($files['size']) ? $files['size'][$i] : $files['size'];
            $type = is_array($files['type']) ? $files['type'][$i] : $files['type'];
            $error = is_array($files['error']) ? $files['error'][$i] : $files['error'];

            if ($error !== UPLOAD_ERR_OK || !$tmpName) continue;
            if ($size > $maxSize) continue;

            $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            if (in_array($ext, $forbidden)) continue;

            $safeName = time() . '_' . $count . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $name);
            $filePath = $uploadDir . '/' . $safeName;

            if (move_uploaded_file($tmpName, $filePath)) {
                $relativePath = 'uploads/it_requests/' . $requestId . '/' . $safeName;
                
                $stmt = $this->pdo->prepare("
                    INSERT INTO it_request_files (request_id, file_name, file_path, file_size, file_type)
                    VALUES (?, ?, ?, ?, ?)
                ");
                $stmt->execute([$requestId, $name, $relativePath, $size, $type]);

                $uploaded[] = [
                    'id' => (int)$this->pdo->lastInsertId(),
                    'file_name' => $name,
                    'file_size' => $size,
                    'file_type' => $type,
                ];
                $count++;
            }
        }

        return $uploaded;
    }

    /**
     * Get requests for a specific user (My Requests)
     */
    public function getMyRequests(int $userId): array {
        $stmt = $this->pdo->prepare("
            SELECT r.*, 
                   (SELECT COUNT(*) FROM it_request_files f WHERE f.request_id = r.id) as file_count,
                   (SELECT COUNT(*) FROM it_request_updates u WHERE u.request_id = r.id) as update_count
            FROM it_requests r
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    /**
     * Get a single request by ID
     */
    public function getRequest(int $requestId, ?int $ownerUserId = null): ?array {
        $sql = "
            SELECT r.*, u.name as requester_name, u.name_th as requester_name_th, u.email as requester_email,
                   a.name as assigned_name, a.name_th as assigned_name_th
            FROM it_requests r
            JOIN users u ON u.id = r.user_id
            LEFT JOIN users a ON a.id = r.assigned_to
            WHERE r.id = ?
        ";
        $params = [$requestId];

        if ($ownerUserId !== null) {
            $sql .= " AND r.user_id = ?";
            $params[] = $ownerUserId;
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Get all requests (IT / Management view)
     */
    public function getAllRequests(?string $statusFilter = null, ?string $search = null): array {
        $sql = "
            SELECT r.*, 
                   u.name as requester_name, u.name_th as requester_name_th,
                   a.name as assigned_name, a.name_th as assigned_name_th,
                   (SELECT COUNT(*) FROM it_request_files f WHERE f.request_id = r.id) as file_count,
                   (SELECT COUNT(*) FROM it_request_updates up WHERE up.request_id = r.id) as update_count
            FROM it_requests r
            JOIN users u ON u.id = r.user_id
            LEFT JOIN users a ON a.id = r.assigned_to
            WHERE 1=1
        ";
        $params = [];

        if ($statusFilter && $statusFilter !== 'all') {
            $sql .= " AND r.status = ?";
            $params[] = $statusFilter;
        }

        if ($search) {
            $sql .= " AND (r.title LIKE ? OR r.description LIKE ? OR u.name LIKE ? OR u.name_th LIKE ?)";
            $like = '%' . $search . '%';
            $params = array_merge($params, [$like, $like, $like, $like]);
        }

        $sql .= " ORDER BY r.created_at DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Claim a request (IT staff takes ownership)
     */
    public function claimRequest(int $requestId, int $userId): bool {
        $current = $this->getRequest($requestId);
        if (!$current) return false;

        $stmt = $this->pdo->prepare("UPDATE it_requests SET assigned_to = ?, assigned_at = NOW() WHERE id = ?");
        $stmt->execute([$userId, $requestId]);

        if ($current['status'] === 'pending') {
            $this->updateStatus($requestId, 'in_progress', $userId, 'รับงานแล้ว');
        } else {
            $stmt2 = $this->pdo->prepare("INSERT INTO it_request_updates (request_id, user_id, note) VALUES (?, ?, 'รับงานแล้ว')");
            $stmt2->execute([$requestId, $userId]);
        }

        return true;
    }

    /**
     * Update request status
     */
    public function updateStatus(int $requestId, string $newStatus, int $updatedByUserId, ?string $note = null): bool {
        $current = $this->getRequest($requestId);
        if (!$current) return false;

        $oldStatus = $current['status'];

        $stmt = $this->pdo->prepare("UPDATE it_requests SET status = ? WHERE id = ?");
        $stmt->execute([$newStatus, $requestId]);

        $stmt = $this->pdo->prepare("
            INSERT INTO it_request_updates (request_id, user_id, old_status, new_status, note)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$requestId, $updatedByUserId, $oldStatus, $newStatus, $note]);

        return true;
    }

    /**
     * Toggle disbursement status
     */
    public function toggleDisburse(int $requestId, int $updatedByUserId, bool $isDisbursed, ?string $note = null): bool {
        $stmt = $this->pdo->prepare("UPDATE it_requests SET is_disbursed = ? WHERE id = ?");
        $stmt->execute([$isDisbursed ? 1 : 0, $requestId]);

        $stmt = $this->pdo->prepare("
            INSERT INTO it_request_updates (request_id, user_id, note, is_disbursed_change)
            VALUES (?, ?, ?, 1)
        ");
        $logNote = ($isDisbursed ? 'เบิกเงินแล้ว' : 'ยกเลิกเบิกเงิน') . ($note ? " — $note" : '');
        $stmt->execute([$requestId, $updatedByUserId, $logNote]);

        return true;
    }

    /**
     * Get files for a request
     */
    public function getRequestFiles(int $requestId): array {
        $stmt = $this->pdo->prepare("SELECT * FROM it_request_files WHERE request_id = ? ORDER BY uploaded_at ASC");
        $stmt->execute([$requestId]);
        return $stmt->fetchAll();
    }

    /**
     * Get a single file
     */
    public function getFile(int $fileId): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM it_request_files WHERE id = ?");
        $stmt->execute([$fileId]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Get update history for a request
     */
    public function getRequestUpdates(int $requestId): array {
        $stmt = $this->pdo->prepare("
            SELECT ru.*, u.name as updater_name, u.name_th as updater_name_th
            FROM it_request_updates ru
            JOIN users u ON u.id = ru.user_id
            WHERE ru.request_id = ?
            ORDER BY ru.created_at ASC
        ");
        $stmt->execute([$requestId]);
        return $stmt->fetchAll();
    }

    /**
     * Get user permissions
     */
    public function getUserPermissions(int $userId): array {
        $stmt = $this->pdo->prepare("SELECT * FROM it_permissions WHERE user_id = ?");
        $stmt->execute([$userId]);
        $perm = $stmt->fetch();

        if (!$perm) {
            return [
                'can_submit' => 1,
                'can_it' => 0,
                'can_management' => 0,
                'can_manage_permissions' => 0,
            ];
        }

        return [
            'can_submit' => intval($perm['can_submit']),
            'can_it' => intval($perm['can_it']),
            'can_management' => intval($perm['can_management']),
            'can_manage_permissions' => intval($perm['can_manage_permissions']),
        ];
    }

    /**
     * Get all users with their permissions
     */
    public function getAllUsersPermissions(): array {
        $stmt = $this->pdo->query("
            SELECT u.id, u.name, u.name_th, u.email, u.status,
                   IFNULL(p.can_submit, 1) as can_submit,
                   IFNULL(p.can_it, 0) as can_it,
                   IFNULL(p.can_management, 0) as can_management,
                   IFNULL(p.can_manage_permissions, 0) as can_manage_permissions
            FROM users u
            LEFT JOIN it_permissions p ON u.id = p.user_id
            WHERE u.status = 'active'
            ORDER BY u.name ASC
        ");
        $users = $stmt->fetchAll();

        foreach ($users as &$u) {
            $u['id'] = intval($u['id']);
            $u['can_submit'] = intval($u['can_submit']);
            $u['can_it'] = intval($u['can_it']);
            $u['can_management'] = intval($u['can_management']);
            $u['can_manage_permissions'] = intval($u['can_manage_permissions']);
        }

        return $users;
    }

    /**
     * Update user permissions
     */
    public function updatePermission(int $targetUserId, array $perms): bool {
        $stmt = $this->pdo->prepare("
            INSERT INTO it_permissions (user_id, can_submit, can_it, can_management, can_manage_permissions)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                can_submit = VALUES(can_submit),
                can_it = VALUES(can_it),
                can_management = VALUES(can_management),
                can_manage_permissions = VALUES(can_manage_permissions)
        ");
        return $stmt->execute([
            $targetUserId,
            intval($perms['can_submit'] ?? 1),
            intval($perms['can_it'] ?? 0),
            intval($perms['can_management'] ?? 0),
            intval($perms['can_manage_permissions'] ?? 0),
        ]);
    }

    /**
     * Get dashboard statistics
     */
    public function getDashboardStats(): array {
        $stmt = $this->pdo->query("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN is_disbursed = 1 THEN 1 ELSE 0 END) as disbursed,
                SUM(CASE WHEN is_disbursed = 0 AND status = 'completed' THEN 1 ELSE 0 END) as completed_not_disbursed
            FROM it_requests
        ");
        $res = $stmt->fetch();
        return [
            'total' => intval($res['total'] ?? 0),
            'pending' => intval($res['pending'] ?? 0),
            'in_progress' => intval($res['in_progress'] ?? 0),
            'completed' => intval($res['completed'] ?? 0),
            'rejected' => intval($res['rejected'] ?? 0),
            'disbursed' => intval($res['disbursed'] ?? 0),
            'completed_not_disbursed' => intval($res['completed_not_disbursed'] ?? 0),
        ];
    }

    /**
     * Get tasks assigned to a specific IT user
     */
    public function getMyTasks(int $userId): array {
        $stmt = $this->pdo->prepare("
            SELECT r.*, 
                   u.name as requester_name, u.name_th as requester_name_th,
                   (SELECT COUNT(*) FROM it_request_files f WHERE f.request_id = r.id) as file_count
            FROM it_requests r
            JOIN users u ON u.id = r.user_id
            WHERE r.assigned_to = ?
            ORDER BY 
                CASE r.status WHEN 'in_progress' THEN 0 WHEN 'pending' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,
                r.created_at DESC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    /**
     * Get task stats for a specific IT user
     */
    public function getMyTaskStats(int $userId): array {
        $stmt = $this->pdo->prepare("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN is_disbursed = 1 THEN 1 ELSE 0 END) as disbursed
            FROM it_requests
            WHERE assigned_to = ?
        ");
        $stmt->execute([$userId]);
        $res = $stmt->fetch();
        return [
            'total' => intval($res['total'] ?? 0),
            'pending' => intval($res['pending'] ?? 0),
            'in_progress' => intval($res['in_progress'] ?? 0),
            'completed' => intval($res['completed'] ?? 0),
            'rejected' => intval($res['rejected'] ?? 0),
            'disbursed' => intval($res['disbursed'] ?? 0),
        ];
    }
}
