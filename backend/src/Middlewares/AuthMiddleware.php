<?php
namespace App\Middlewares;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

/**
 * Class AuthMiddleware
 * Validates request authorization using stateless JWT headers.
 */
class AuthMiddleware {
    /**
     * Handle authentication check
     *
     * @return array Decoded token payload
     */
    public static function handle(): array {
        $authHeader = '';

        // Fallback for getting authorization header in different environments
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['Authorization'])) {
            $authHeader = $_SERVER['Authorization'];
        } elseif (function_exists('getallheaders')) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        if (empty($authHeader) || strpos($authHeader, 'Bearer ') !== 0) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'Unauthorized: Missing or invalid Authorization header'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $token = substr($authHeader, 7);
        $secret = $_ENV['JWT_SECRET'] ?? 'siamgroup_super_secret_jwt_key_for_development_purposes';

        try {
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            return (array)$decoded;
        } catch (Exception $e) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'Unauthorized: Token is invalid or expired: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}
