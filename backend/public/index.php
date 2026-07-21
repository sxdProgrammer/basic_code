<?php
header('Content-Type: application/json; charset=utf-8');

// Load PSR-4 Autoloader
require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\Env;
use App\Controllers\AuthController;
use App\Controllers\ItRequestController;

// Load Environmental Configuration
Env::load();

// Dynamic CORS configuration via ALLOWED_ORIGINS env
$allowedOriginsRaw = $_ENV['ALLOWED_ORIGINS'] ?? 'http://localhost:5173,http://localhost:5500,http://localhost:5501,http://localhost';
$allowedOrigins = array_map('trim', explode(',', $allowedOriginsRaw));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: ' . ($allowedOrigins[0] ?? 'http://localhost:5173'));
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Preflight CORS request termination
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Parse Route and Path URI relative to virtual host sub-directory
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$base = '/best_code/backend/public'; // Project Backend Base URL Path
$path = str_replace($base, '', $uri);
$path = rtrim($path, '/') ?: '/';
$method = $_SERVER['REQUEST_METHOD'];

// Dispatch incoming HTTP Request to respective action controllers
try {
    if ($method === 'POST' && $path === '/api/auth/login') {
        $controller = new AuthController();
        $controller->login();
    } elseif ($method === 'GET' && $path === '/api/auth/me') {
        $controller = new AuthController();
        $controller->me();
    } elseif ($method === 'GET' && $path === '/api/requests/my') {
        $controller = new ItRequestController();
        $controller->myRequests();
    } elseif ($method === 'GET' && preg_match('#^/api/requests/my/(\d+)$#', $path, $matches)) {
        $controller = new ItRequestController();
        $controller->mySingleRequest((int)$matches[1]);
    } elseif ($method === 'GET' && $path === '/api/requests') {
        $controller = new ItRequestController();
        $controller->index();
    } elseif ($method === 'POST' && $path === '/api/requests') {
        $controller = new ItRequestController();
        $controller->create();
    } elseif ($method === 'GET' && preg_match('#^/api/requests/(\d+)$#', $path, $matches)) {
        $controller = new ItRequestController();
        $controller->show((int)$matches[1]);
    } elseif ($method === 'POST' && preg_match('#^/api/requests/(\d+)/claim$#', $path, $matches)) {
        $controller = new ItRequestController();
        $controller->claim((int)$matches[1]);
    } elseif (($method === 'POST' || $method === 'PUT') && preg_match('#^/api/requests/(\d+)/status$#', $path, $matches)) {
        $controller = new ItRequestController();
        $controller->status((int)$matches[1]);
    } elseif (($method === 'POST' || $method === 'PUT') && preg_match('#^/api/requests/(\d+)/disburse$#', $path, $matches)) {
        $controller = new ItRequestController();
        $controller->disburse((int)$matches[1]);
    } elseif ($method === 'GET' && $path === '/api/my-tasks') {
        $controller = new ItRequestController();
        $controller->myTasks();
    } elseif ($method === 'GET' && preg_match('#^/api/files/(\d+)/download$#', $path, $matches)) {
        $controller = new ItRequestController();
        $controller->downloadFile((int)$matches[1]);
    } elseif ($method === 'GET' && ($path === '/api/stats' || $path === '/api/dashboard/stats')) {
        $controller = new ItRequestController();
        $controller->stats();
    } elseif ($method === 'GET' && ($path === '/api/permissions' || $path === '/api/permissions/users')) {
        $controller = new ItRequestController();
        $controller->permissions();
    } elseif ($method === 'POST' && ($path === '/api/permissions' || $path === '/api/permissions/update')) {
        $controller = new ItRequestController();
        $controller->updatePermission();
    } elseif ($method === 'GET' && $path === '/api/export') {
        $controller = new ItRequestController();
        $controller->export();
    } else {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => "API Route '{$method} {$path}' Not Found"
        ], JSON_UNESCAPED_UNICODE);
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal Server Error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
