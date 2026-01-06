<?php
/**
 * Users API - Get and update user profiles
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        $id = $_GET['id'] ?? null;
        
        if ($id) {
            $stmt = $db->prepare("SELECT * FROM users WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $user = $stmt->fetch();
            
            if (!$user) {
                jsonResponse(['error' => 'User not found'], 404);
            }
            
            jsonResponse(['success' => true, 'data' => $user]);
        } else {
            $stmt = $db->query("SELECT * FROM users ORDER BY id");
            $users = $stmt->fetchAll();
            jsonResponse(['success' => true, 'data' => $users]);
        }
        break;

    case 'PUT':
        $data = getRequestBody();
        $id = $data['id'] ?? $_GET['id'] ?? null;
        
        if (!$id) {
            jsonResponse(['error' => 'User ID required'], 400);
        }
        
        $fields = [];
        $params = ['id' => $id];
        
        $allowedFields = ['name', 'weight_kg', 'height_cm', 'age', 'activity_level', 
                          'daily_calorie_target', 'protein_target', 'carbs_target', 'fat_target'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                $params[$field] = $data[$field];
            }
        }
        
        if (empty($fields)) {
            jsonResponse(['error' => 'No fields to update'], 400);
        }
        
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
