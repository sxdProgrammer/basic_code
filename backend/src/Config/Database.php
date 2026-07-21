<?php
namespace App\Config;

use PDO;
use PDOException;

/**
 * Class Database
 * Handles database connectivity using PDO in a static connection pool pattern.
 */
class Database {
    private static ?PDO $pdo = null;

    /**
     * Get active PDO database connection
     *
     * @return PDO
     * @throws PDOException
     */
    public static function getConnection(): PDO {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $host    = $_ENV['DB_HOST'] ?? '127.0.0.1';
        $port    = $_ENV['DB_PORT'] ?? '3306';
        $db      = $_ENV['DB_NAME'] ?? '';
        $user    = $_ENV['DB_USER'] ?? 'root';
        $pass    = $_ENV['DB_PASS'] ?? '';
        $charset = $_ENV['DB_CHARSET'] ?? 'utf8mb4';

        $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";

        try {
            self::$pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false, // Enforce native prepared statements
            ]);
            return self::$pdo;
        } catch (PDOException $e) {
            // Logs internally or outputs custom exception
            error_log("Database Connection Failure: " . $e->getMessage());
            throw new PDOException("Database connection failure. Please try again later.", (int)$e->getCode());
        }
    }
}
