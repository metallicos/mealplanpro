<?php
/**
 * Daily Log API - Track daily macros and calories
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        // Get logs for a user and date range
        $userId = $_GET['user_id'] ?? 1;
        $date = $_GET['date'] ?? date('Y-m-d');
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;
        
        if ($startDate && $endDate) {
            // Get range for statistics
            $stmt = $db->prepare("
                SELECT dl.*, u.name as user_name, u.daily_calorie_target, u.protein_target, u.carbs_target, u.fat_target
                FROM daily_logs dl
                JOIN users u ON dl.user_id = u.id
                WHERE dl.user_id = :user_id AND dl.log_date BETWEEN :start_date AND :end_date
                ORDER BY dl.log_date DESC
            ");
            $stmt->execute(['user_id' => $userId, 'start_date' => $startDate, 'end_date' => $endDate]);
        } else {
            // Get single day
            $stmt = $db->prepare("
                SELECT dl.*, u.name as user_name, u.daily_calorie_target, u.protein_target, u.carbs_target, u.fat_target
                FROM daily_logs dl
                JOIN users u ON dl.user_id = u.id
                WHERE dl.user_id = :user_id AND dl.log_date = :date
            ");
            $stmt->execute(['user_id' => $userId, 'date' => $date]);
        }
        
        $logs = $stmt->fetchAll();
        
        // Get items for each log
        foreach ($logs as &$log) {
            $itemStmt = $db->prepare("
                SELECT dli.*, f.name as food_name, f.category
                FROM daily_log_items dli
                JOIN foods f ON dli.food_id = f.id
                WHERE dli.daily_log_id = :log_id
                ORDER BY dli.created_at
            ");
            $itemStmt->execute(['log_id' => $log['id']]);
            $log['items'] = $itemStmt->fetchAll();
        }
        
        jsonResponse(['success' => true, 'data' => $logs]);
        break;

    case 'POST':
        // Add food item to daily log
        $data = getRequestBody();
        
        $userId = $data['user_id'] ?? 1;
        $date = $data['date'] ?? date('Y-m-d');
        $foodId = $data['food_id'] ?? null;
        $grams = $data['grams'] ?? null;
        $mealType = $data['meal_type'] ?? 'main';
        
        if (!$foodId || !$grams) {
            jsonResponse(['error' => 'food_id and grams are required'], 400);
        }
        
        // Get or create daily log
        $stmt = $db->prepare("SELECT id FROM daily_logs WHERE user_id = :user_id AND log_date = :date");
        $stmt->execute(['user_id' => $userId, 'date' => $date]);
        $log = $stmt->fetch();
        
        if (!$log) {
            $stmt = $db->prepare("INSERT INTO daily_logs (user_id, log_date) VALUES (:user_id, :date)");
            $stmt->execute(['user_id' => $userId, 'date' => $date]);
            $logId = $db->lastInsertId();
        } else {
            $logId = $log['id'];
        }
        
        // Get food nutritional info
        $stmt = $db->prepare("SELECT * FROM foods WHERE id = :id");
        $stmt->execute(['id' => $foodId]);
        $food = $stmt->fetch();
        
        if (!$food) {
            jsonResponse(['error' => 'Food not found'], 404);
        }
        
        // Calculate macros for portion
        $multiplier = $grams / 100;
        $calories = round($food['calories_per_100g'] * $multiplier, 2);
        $protein = round($food['protein_per_100g'] * $multiplier, 2);
        $carbs = round($food['carbs_per_100g'] * $multiplier, 2);
        $fat = round($food['fat_per_100g'] * $multiplier, 2);
        
        // Insert log item
        $stmt = $db->prepare("
            INSERT INTO daily_log_items (daily_log_id, food_id, meal_type, grams, calories, protein, carbs, fat)
            VALUES (:log_id, :food_id, :meal_type, :grams, :calories, :protein, :carbs, :fat)
        ");
        $stmt->execute([
            'log_id' => $logId,
            'food_id' => $foodId,
            'meal_type' => $mealType,
            'grams' => $grams,
            'calories' => $calories,
            'protein' => $protein,
            'carbs' => $carbs,
            'fat' => $fat,
        ]);
        
        // Update daily totals
        $stmt = $db->prepare("
            UPDATE daily_logs SET
                total_calories = (SELECT COALESCE(SUM(calories), 0) FROM daily_log_items WHERE daily_log_id = :log_id),
                total_protein = (SELECT COALESCE(SUM(protein), 0) FROM daily_log_items WHERE daily_log_id = :log_id),
                total_carbs = (SELECT COALESCE(SUM(carbs), 0) FROM daily_log_items WHERE daily_log_id = :log_id),
                total_fat = (SELECT COALESCE(SUM(fat), 0) FROM daily_log_items WHERE daily_log_id = :log_id)
            WHERE id = :log_id
        ");
        $stmt->execute(['log_id' => $logId]);
        
        jsonResponse(['success' => true, 'item_id' => $db->lastInsertId()], 201);
        break;

    case 'PUT':
        // Update weight for a day
        $data = getRequestBody();
        
        $userId = $data['user_id'] ?? 1;
        $date = $data['date'] ?? date('Y-m-d');
        $weight = $data['weight_kg'] ?? null;
        $notes = $data['notes'] ?? null;
        
        $stmt = $db->prepare("
            INSERT INTO daily_logs (user_id, log_date, weight_kg, notes)
            VALUES (:user_id, :date, :weight, :notes)
            ON DUPLICATE KEY UPDATE weight_kg = :weight2, notes = :notes2
        ");
        $stmt->execute([
            'user_id' => $userId,
            'date' => $date,
            'weight' => $weight,
            'notes' => $notes,
            'weight2' => $weight,
            'notes2' => $notes,
        ]);
        
        jsonResponse(['success' => true]);
        break;

    case 'DELETE':
        // Remove food item from log
        $itemId = $_GET['item_id'] ?? null;
        
        if (!$itemId) {
            jsonResponse(['error' => 'item_id required'], 400);
        }
        
        // Get log id before deleting
        $stmt = $db->prepare("SELECT daily_log_id FROM daily_log_items WHERE id = :id");
        $stmt->execute(['id' => $itemId]);
        $item = $stmt->fetch();
        
        if (!$item) {
            jsonResponse(['error' => 'Item not found'], 404);
        }
        
        $logId = $item['daily_log_id'];
        
        // Delete item
        $stmt = $db->prepare("DELETE FROM daily_log_items WHERE id = :id");
        $stmt->execute(['id' => $itemId]);
        
        // Update daily totals
        $stmt = $db->prepare("
            UPDATE daily_logs SET
                total_calories = (SELECT COALESCE(SUM(calories), 0) FROM daily_log_items WHERE daily_log_id = :log_id),
                total_protein = (SELECT COALESCE(SUM(protein), 0) FROM daily_log_items WHERE daily_log_id = :log_id),
                total_carbs = (SELECT COALESCE(SUM(carbs), 0) FROM daily_log_items WHERE daily_log_id = :log_id),
                total_fat = (SELECT COALESCE(SUM(fat), 0) FROM daily_log_items WHERE daily_log_id = :log_id)
            WHERE id = :log_id
        ");
        $stmt->execute(['log_id' => $logId]);
        
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
