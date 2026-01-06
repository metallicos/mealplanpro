<?php
/**
 * Foods API - CRUD operations for food database
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        // Get all foods or search
        $search = $_GET['search'] ?? '';
        $category = $_GET['category'] ?? '';
        
        $sql = "SELECT * FROM foods WHERE is_active = 1";
        $params = [];
        
        if ($search) {
            $sql .= " AND name LIKE :search";
            $params['search'] = '%' . $search . '%';
        }
        
        if ($category) {
            $sql .= " AND category = :category";
            $params['category'] = $category;
        }
        
        $sql .= " ORDER BY category, name";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $foods = $stmt->fetchAll();
        
        jsonResponse(['success' => true, 'data' => $foods]);
        break;

    case 'POST':
        // Add new food
        $data = getRequestBody();
        
        if (empty($data['name']) || !isset($data['calories_per_100g'])) {
            jsonResponse(['error' => 'Name and calories are required'], 400);
        }
        
        $stmt = $db->prepare("
            INSERT INTO foods (name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g)
            VALUES (:name, :category, :calories, :protein, :carbs, :fat, :fiber)
        ");
        
        $stmt->execute([
            'name' => $data['name'],
            'category' => $data['category'] ?? 'other',
            'calories' => $data['calories_per_100g'],
            'protein' => $data['protein_per_100g'] ?? 0,
            'carbs' => $data['carbs_per_100g'] ?? 0,
            'fat' => $data['fat_per_100g'] ?? 0,
            'fiber' => $data['fiber_per_100g'] ?? 0,
        ]);
        
        jsonResponse(['success' => true, 'id' => $db->lastInsertId()], 201);
        break;

    case 'DELETE':
        // Soft delete food
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            jsonResponse(['error' => 'Food ID required'], 400);
        }
        
        $stmt = $db->prepare("UPDATE foods SET is_active = 0 WHERE id = :id");
        $stmt->execute(['id' => $id]);
        
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
