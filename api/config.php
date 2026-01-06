<?php
/**
 * Database Configuration for Meal Plan App
 * Connects to MariaDB in Laradock container
 */

define('DB_HOST', 'mariadb');
define('DB_NAME', 'meal_plan_app');
define('DB_USER', 'root');
define('DB_PASS', 'root');
define('DB_CHARSET', 'utf8mb4');

/**
 * Get PDO database connection
 */
function getDB(): PDO {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
    }
    
    return $pdo;
}

/**
 * Send JSON response
 */
function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    echo json_encode($data);
    exit;
}

/**
 * Get JSON request body
 */
function getRequestBody(): array {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

/**
 * Handle CORS preflight
 */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(200);
    exit;
}
