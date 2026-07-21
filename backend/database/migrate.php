<?php
/**
 * Programmatic Database Migration and Seeding Script for IT Request System (Dev_work standard)
 * Run this file from the terminal or browser to initialize the database schema and default rows.
 */

header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\Env;
use App\Config\Database;

Env::load();

$host = $_ENV['DB_HOST'] ?? '127.0.0.1';
$port = $_ENV['DB_PORT'] ?? '3306';
$dbName = $_ENV['DB_NAME'] ?? 'best_code_db';
$user = $_ENV['DB_USER'] ?? 'root';
$pass = $_ENV['DB_PASS'] ?? '';
$charset = $_ENV['DB_CHARSET'] ?? 'utf8mb4';

try {
    echo "=========================================================\n";
    echo "MIGRATING IT REQUEST DATABASE SCHEMA FOR: {$dbName}\n";
    echo "=========================================================\n\n";

    // 1. Initial Connection to MySQL server to check/create the DB itself
    $dsnNoDb = "mysql:host={$host};port={$port};charset={$charset}";
    $tempPdo = new PDO($dsnNoDb, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    echo "[1/3] Creating database if not exists...\n";
    $tempPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "✔ Database `{$dbName}` verified/created successfully.\n\n";
    $tempPdo = null;

    // 2. Connect to the target DB using App\Config\Database
    $pdo = Database::getConnection();

    echo "[2/3] Creating tables...\n";

    // Drop tables if they exist to prevent schema conflicts during migration reset
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("DROP TABLE IF EXISTS `it_permissions`;");
    $pdo->exec("DROP TABLE IF EXISTS `it_request_updates`;");
    $pdo->exec("DROP TABLE IF EXISTS `it_request_files`;");
    $pdo->exec("DROP TABLE IF EXISTS `it_requests`;");
    $pdo->exec("DROP TABLE IF EXISTS `users`;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    // T1: Users
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `users` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `username` VARCHAR(50) NOT NULL UNIQUE,
            `password_hash` VARCHAR(255) NOT NULL,
            `name` VARCHAR(100) NOT NULL,
            `name_th` VARCHAR(100) NOT NULL,
            `email` VARCHAR(100) NOT NULL,
            `phone_number` VARCHAR(20) NULL,
            `role` ENUM('superadmin', 'admin', 'staff') NOT NULL DEFAULT 'staff',
            `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✔ Table `users` ready.\n";

    // T2: IT Requests
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `it_requests` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `title` VARCHAR(255) NOT NULL,
            `description` TEXT NOT NULL,
            `url` VARCHAR(500) NULL,
            `status` ENUM('pending', 'in_progress', 'completed', 'rejected') NOT NULL DEFAULT 'pending',
            `is_disbursed` TINYINT(1) NOT NULL DEFAULT 0,
            `assigned_to` INT NULL,
            `assigned_at` DATETIME NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT `fk_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
            CONSTRAINT `fk_requests_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
            INDEX `idx_user_id` (`user_id`),
            INDEX `idx_status` (`status`),
            INDEX `idx_created_at` (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✔ Table `it_requests` ready.\n";

    // T3: IT Request Files
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `it_request_files` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `request_id` INT NOT NULL,
            `file_name` VARCHAR(255) NOT NULL,
            `file_path` VARCHAR(500) NOT NULL,
            `file_size` INT NOT NULL DEFAULT 0,
            `file_type` VARCHAR(100) NULL,
            `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT `fk_files_request` FOREIGN KEY (`request_id`) REFERENCES `it_requests` (`id`) ON DELETE CASCADE,
            INDEX `idx_request_id` (`request_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✔ Table `it_request_files` ready.\n";

    // T4: IT Request Updates
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `it_request_updates` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `request_id` INT NOT NULL,
            `user_id` INT NOT NULL,
            `old_status` VARCHAR(20) NULL,
            `new_status` VARCHAR(20) NULL,
            `note` TEXT NULL,
            `is_disbursed_change` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT `fk_updates_request` FOREIGN KEY (`request_id`) REFERENCES `it_requests` (`id`) ON DELETE CASCADE,
            CONSTRAINT `fk_updates_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
            INDEX `idx_request_id` (`request_id`),
            INDEX `idx_user_id` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✔ Table `it_request_updates` ready.\n";

    // T5: IT Permissions
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `it_permissions` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `can_submit` TINYINT(1) NOT NULL DEFAULT 1,
            `can_it` TINYINT(1) NOT NULL DEFAULT 0,
            `can_management` TINYINT(1) NOT NULL DEFAULT 0,
            `can_manage_permissions` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT `fk_permissions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
            UNIQUE KEY `uk_user_id` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✔ Table `it_permissions` ready.\n\n";

    echo "[3/3] Seeding default lookup data...\n";

    // Seed Default Users
    $defaultPassword = password_hash('123456', PASSWORD_BCRYPT);
    $users = [
        [
            'username' => 'admin',
            'password' => $defaultPassword,
            'name' => 'Admin User',
            'name_th' => 'ผู้ดูแลระบบ',
            'email' => 'admin@siamgroup.com',
            'phone_number' => '0800000000',
            'role' => 'superadmin',
            'permissions' => ['can_submit' => 1, 'can_it' => 1, 'can_management' => 1, 'can_manage_permissions' => 1]
        ],
        [
            'username' => 'superadmin',
            'password' => $defaultPassword,
            'name' => 'Super Admin',
            'name_th' => 'ผู้ดูแลระบบสูงสุด',
            'email' => 'superadmin@siamgroup.com',
            'phone_number' => '0812345678',
            'role' => 'superadmin',
            'permissions' => ['can_submit' => 1, 'can_it' => 1, 'can_management' => 1, 'can_manage_permissions' => 1]
        ],
        [
            'username' => 'it_staff',
            'password' => $defaultPassword,
            'name' => 'IT Support',
            'name_th' => 'เจ้าหน้าที่ไอที',
            'email' => 'itsupport@siamgroup.com',
            'phone_number' => '0898765432',
            'role' => 'staff',
            'permissions' => ['can_submit' => 1, 'can_it' => 1, 'can_management' => 0, 'can_manage_permissions' => 0]
        ],
        [
            'username' => 'manager',
            'password' => $defaultPassword,
            'name' => 'General Manager',
            'name_th' => 'ผู้จัดการทั่วไป',
            'email' => 'manager@siamgroup.com',
            'phone_number' => '0887654321',
            'role' => 'admin',
            'permissions' => ['can_submit' => 1, 'can_it' => 0, 'can_management' => 1, 'can_manage_permissions' => 0]
        ],
        [
            'username' => 'staff_user',
            'password' => $defaultPassword,
            'name' => 'Office Staff',
            'name_th' => 'พนักงานทั่วไป',
            'email' => 'staff@siamgroup.com',
            'phone_number' => '0865432109',
            'role' => 'staff',
            'permissions' => ['can_submit' => 1, 'can_it' => 0, 'can_management' => 0, 'can_manage_permissions' => 0]
        ],
    ];

    $stmtUser = $pdo->prepare("
        INSERT INTO users (username, password_hash, name, name_th, email, phone_number, role, status) 
        VALUES (:username, :password, :name, :name_th, :email, :phone_number, :role, 'active')
    ");

    $stmtPerm = $pdo->prepare("
        INSERT INTO it_permissions (user_id, can_submit, can_it, can_management, can_manage_permissions)
        VALUES (:user_id, :can_submit, :can_it, :can_management, :can_manage_permissions)
    ");

    foreach ($users as $u) {
        $stmtUser->execute([
            ':username' => $u['username'],
            ':password' => $u['password'],
            ':name' => $u['name'],
            ':name_th' => $u['name_th'],
            ':email' => $u['email'],
            ':phone_number' => $u['phone_number'],
            ':role' => $u['role']
        ]);
        $userId = (int)$pdo->lastInsertId();

        $stmtPerm->execute([
            ':user_id' => $userId,
            ':can_submit' => $u['permissions']['can_submit'],
            ':can_it' => $u['permissions']['can_it'],
            ':can_management' => $u['permissions']['can_management'],
            ':can_manage_permissions' => $u['permissions']['can_manage_permissions']
        ]);
    }
    echo "✔ Default users and permission lists seeded (Password: 123456).\n";

    // Seed default IT Requests
    $staffId = $pdo->query("SELECT id FROM users WHERE username = 'staff_user'")->fetchColumn();
    $itId = $pdo->query("SELECT id FROM users WHERE username = 'it_staff'")->fetchColumn();

    $requests = [
        [
            'user_id' => $staffId,
            'title' => 'ต้องการติดตั้งโปรแกรม Adobe Acrobat Reader',
            'description' => 'เนื่องจากต้องใช้ในการเปิดและแก้ไขไฟล์ PDF ของแผนกจัดซื้อ คาดว่าใช้เวลาประมาณ 10 นาทีครับ',
            'url' => 'https://get.adobe.com/reader/',
            'status' => 'pending',
            'is_disbursed' => 0,
            'assigned_to' => null
        ],
        [
            'user_id' => $staffId,
            'title' => 'ขออนุมัติจัดซื้อเมาส์ไร้สายเสียงเงียบ (Logitech M221)',
            'description' => 'ขออนุมัติเบิกงบประมาณในการจัดซื้อเมาส์เสียงเงียบทดแทนตัวเก่าที่พัง ยอดเงินประมาณ 490 บาทครับ',
            'url' => 'https://www.logitech.com/th-th/products/mice/m221-silent.910-004882.html',
            'status' => 'completed',
            'is_disbursed' => 1,
            'assigned_to' => $itId
        ],
        [
            'user_id' => $staffId,
            'title' => 'ไม่สามารถเชื่อมต่ออินเทอร์เน็ตที่โต๊ะทำงานได้',
            'description' => 'หน้าจอแจ้งขึ้นเตือนสายแลนไม่ได้เสียบ (Network Cable Unplugged) รบกวนเจ้าหน้าที่ไอทีเข้าตรวจเช็คสายเคเบิลใต้โต๊ะด้วยครับ',
            'url' => null,
            'status' => 'in_progress',
            'is_disbursed' => 0,
            'assigned_to' => $itId
        ]
    ];

    $stmtReq = $pdo->prepare("
        INSERT INTO it_requests (user_id, title, description, url, status, is_disbursed, assigned_to, assigned_at, created_at)
        VALUES (:user_id, :title, :description, :url, :status, :is_disbursed, :assigned_to, :assigned_at, NOW())
    ");

    $stmtUpdateLog = $pdo->prepare("
        INSERT INTO it_request_updates (request_id, user_id, old_status, new_status, note)
        VALUES (?, ?, ?, ?, ?)
    ");

    foreach ($requests as $r) {
        $assignedAt = $r['assigned_to'] !== null ? date('Y-m-d H:i:s') : null;
        $stmtReq->execute([
            ':user_id' => $r['user_id'],
            ':title' => $r['title'],
            ':description' => $r['description'],
            ':url' => $r['url'],
            ':status' => $r['status'],
            ':is_disbursed' => $r['is_disbursed'],
            ':assigned_to' => $r['assigned_to'],
            ':assigned_at' => $assignedAt
        ]);
        $requestId = (int)$pdo->lastInsertId();

        if ($r['status'] === 'in_progress') {
            $stmtUpdateLog->execute([$requestId, $itId, 'pending', 'in_progress', 'รับงานเข้าตรวจเช็คครับ']);
        } elseif ($r['status'] === 'completed') {
            $stmtUpdateLog->execute([$requestId, $itId, 'pending', 'in_progress', 'รับงาน']);
            $stmtUpdateLog->execute([$requestId, $itId, 'in_progress', 'completed', 'ดำเนินการติดตั้งและซื้อของเสร็จสิ้น']);
        }
    }
    echo "✔ Default IT requests seeded successfully.\n\n";

    echo "=========================================================\n";
    echo "MIGRATION SUCCESSFUL! IT REQUEST DATABASE READY.\n";
    echo "=========================================================\n";

} catch (Exception $e) {
    http_response_code(500);
    echo "\n❌ MIGRATION ERROR: " . $e->getMessage() . "\n";
}
