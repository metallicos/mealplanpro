<?php
/**
 * Groceries API - Manage grocery list
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        $weekStart = $_GET['week_start'] ?? date('Y-m-d', strtotime('monday this week'));
        
        $stmt = $db->prepare("
            SELECT * FROM grocery_items 
            WHERE week_start_date = :week_start OR week_start_date IS NULL
            ORDER BY category, name
        ");
        $stmt->execute(['week_start' => $weekStart]);
        $items = $stmt->fetchAll();
        
        // Group by category
        $grouped = [];
        foreach ($items as $item) {
            $cat = $item['category'] ?? 'Other';
            if (!isset($grouped[$cat])) {
                $grouped[$cat] = [];
            }
            $grouped[$cat][] = $item;
        }
        
        jsonResponse(['success' => true, 'data' => $items, 'grouped' => $grouped]);
        break;

    case 'POST':
        $data = getRequestBody();
        
        // Check if it's a generate request
        if (isset($data['generate']) && $data['generate']) {
            // Auto-generate from meal plan
            $weekStart = $data['week_start'] ?? date('Y-m-d', strtotime('monday this week'));
            
            // Clear existing items for this week
            $stmt = $db->prepare("DELETE FROM grocery_items WHERE week_start_date = :week_start");
            $stmt->execute(['week_start' => $weekStart]);
            
            // Get all meal plan items and aggregate
            $stmt = $db->prepare("
                SELECT f.name, f.category, SUM(mpi.grams) as total_grams
                FROM meal_plan_items mpi
                JOIN foods f ON mpi.food_id = f.id
                GROUP BY f.id
                ORDER BY f.category, f.name
            ");
            $stmt->execute();
            $items = $stmt->fetchAll();
            
            // Insert grocery items
            $insertStmt = $db->prepare("
                INSERT INTO grocery_items (name, quantity, unit, category, week_start_date)
                VALUES (:name, :quantity, :unit, :category, :week_start)
            ");
            
            foreach ($items as $item) {
                $quantity = $item['total_grams'];
                $unit = 'g';
                
                // Convert to kg if over 1000g
                if ($quantity >= 1000) {
                    $quantity = round($quantity / 1000, 2);
                    $unit = 'kg';
                }
                
                $insertStmt->execute([
                    'name' => $item['name'],
                    'quantity' => $quantity,
                    'unit' => $unit,
                    'category' => $item['category'],
                    'week_start' => $weekStart,
                ]);
            }
            
            jsonResponse(['success' => true, 'message' => 'Grocery list generated']);
        } else {
            // Add single item
            if (empty($data['name'])) {
                jsonResponse(['error' => 'Name is required'], 400);
            }
            
            $stmt = $db->prepare("
                INSERT INTO grocery_items (name, quantity, unit, category, estimated_price_mad, week_start_date)
                VALUES (:name, :quantity, :unit, :category, :price, :week_start)
            ");
            
            $stmt->execute([
                'name' => $data['name'],
                'quantity' => $data['quantity'] ?? null,
                'unit' => $data['unit'] ?? 'g',
                'category' => $data['category'] ?? 'Other',
                'price' => $data['estimated_price_mad'] ?? null,
                'week_start' => $data['week_start_date'] ?? date('Y-m-d', strtotime('monday this week')),
            ]);
            
            jsonResponse(['success' => true, 'id' => $db->lastInsertId()], 201);
        }
        break;

    case 'PUT':
        // Toggle purchased status
        $data = getRequestBody();
        $id = $data['id'] ?? $_GET['id'] ?? null;
        
        if (!$id) {
            jsonResponse(['error' => 'Item ID required'], 400);
        }
        
        if (isset($data['is_purchased'])) {
            $stmt = $db->prepare("UPDATE grocery_items SET is_purchased = :purchased WHERE id = :id");
            $stmt->execute(['purchased' => $data['is_purchased'] ? 1 : 0, 'id' => $id]);
        }
        
        if (isset($data['quantity'])) {
            $stmt = $db->prepare("UPDATE grocery_items SET quantity = :quantity WHERE id = :id");
            $stmt->execute(['quantity' => $data['quantity'], 'id' => $id]);
        }
        
        jsonResponse(['success' => true]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            jsonResponse(['error' => 'Item ID required'], 400);
        }
        
        $stmt = $db->prepare("DELETE FROM grocery_items WHERE id = :id");
        $stmt->execute(['id' => $id]);
        
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
