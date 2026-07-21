<?php
namespace App\Config;

/**
 * Class Env
 * Responsible for loading environmental variables from .env using Dotenv.
 */
class Env {
    public static function load() {
        $path = __DIR__ . '/../../';
        if (file_exists($path . '.env')) {
            $dotenvClass = 'Dotenv\\Dotenv';
            if (class_exists($dotenvClass)) {
                $dotenv = $dotenvClass::createImmutable($path);
                $dotenv->load();
            }
        }
    }
}
