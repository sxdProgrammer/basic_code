<?php
namespace App\Controllers;

use App\Config\Database;
use Firebase\JWT\JWT;
use PDO;

/**
 * Class AuthController
 * Handles login authentication actions and token issues.
 */
class AuthController {
    /**
     * POST /api/auth/login
     */
    public function login() {
        // Read JSON input
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? '');

        if ($username === '' || $password === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'กรุณากรอก Username และ Password ให้ครบถ้วน'], JSON_UNESCAPED_UNICODE);
            return;
        }

        error_log("Login Attempt: Username = '{$username}', Password = '{$password}'");

        try {
            $pdo = Database::getConnection();

            $loginLower = strtolower($username);
            $loginPhone = preg_replace('/[^0-9]/', '', $username);

            $sql = "SELECT u.id, u.username, u.password_hash, u.name, u.name_th, u.email, u.role 
                    FROM users u 
                    WHERE u.status = 'active' AND ";
            $params = [];

            if (filter_var($username, FILTER_VALIDATE_EMAIL)) {
                $sql .= "LOWER(u.email) = ?";
                $params[] = $loginLower;
            } elseif (ctype_digit($loginPhone) && strlen($loginPhone) >= 9) {
                $sql .= "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(u.phone_number, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?";
                $params[] = $loginPhone;
            } else {
                $sql .= "(u.username = ? OR u.name = ? OR u.name_th = ?)";
                $params[] = $username;
                $params[] = $username;
                $params[] = $username;
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $user = $stmt->fetch();
 
            if (!$user || !password_verify($password, $user['password_hash'])) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
                return;
            }
 
            $svc = new \App\Services\ItRequestService();
            $perms = $svc->getUserPermissions((int)$user['id']);

            // Create token payload
            $secret = $_ENV['JWT_SECRET'] ?? 'siamgroup_super_secret_jwt_key_for_development_purposes';
            $expiry = intval($_ENV['JWT_ACCESS_EXPIRY'] ?? 3600);
            $issuedAt = time();
            $expireAt = $issuedAt + $expiry;
 
            $payload = [
                'iss' => 'siamgroup_best_code',
                'aud' => 'siamgroup_frontend',
                'iat' => $issuedAt,
                'exp' => $expireAt,
                'user' => [
                    'id' => (int)$user['id'],
                    'username' => $user['username'],
                    'name' => $user['name'],
                    'name_th' => $user['name_th'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'permissions' => $perms
                ]
            ];

            $jwt = JWT::encode($payload, $secret, 'HS256');

            echo json_encode([
                'success' => true,
                'token' => $jwt,
                'user' => $payload['user']
            ], JSON_UNESCAPED_UNICODE);

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'เกิดข้อผิดพลาดในการล็อกอิน: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * GET /api/auth/me
     */
    public function me() {
        $token = \App\Middlewares\AuthMiddleware::handle();
        $user = $token['user'];
        $userId = is_array($user) ? (int)$user['id'] : (int)$user->id;

        try {
            $svc = new \App\Services\ItRequestService();
            $perms = $svc->getUserPermissions($userId);

            echo json_encode([
                'success' => true,
                'id' => $userId,
                'username' => is_array($user) ? $user['username'] : $user->username,
                'name' => is_array($user) ? $user['name'] : $user->name,
                'name_th' => is_array($user) ? $user['name_th'] : $user->name_th,
                'email' => is_array($user) ? $user['email'] : $user->email,
                'role' => is_array($user) ? $user['role'] : $user->role,
                'permissions' => $perms
            ], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }
}
