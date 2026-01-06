<?php
/**
 * Statistics API - Calculate and return aggregated statistics
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

if ($method !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$userId = $_GET['user_id'] ?? 1;
$period = $_GET['period'] ?? 'week'; // week, month, all

// Calculate date range
$endDate = date('Y-m-d');
switch ($period) {
    case 'week':
        $startDate = date('Y-m-d', strtotime('-7 days'));
        break;
    case 'month':
        $startDate = date('Y-m-d', strtotime('-30 days'));
        break;
    case 'all':
        $startDate = date('Y-m-d', strtotime('-365 days'));
        break;
    default:
        $startDate = date('Y-m-d', strtotime('-7 days'));
}

// Get user info
$stmt = $db->prepare("SELECT * FROM users WHERE id = :id");
$stmt->execute(['id' => $userId]);
$user = $stmt->fetch();

if (!$user) {
    jsonResponse(['error' => 'User not found'], 404);
}

// Get daily logs for period
$stmt = $db->prepare("
    SELECT log_date, total_calories, total_protein, total_carbs, total_fat, weight_kg
    FROM daily_logs
    WHERE user_id = :user_id AND log_date BETWEEN :start_date AND :end_date
    ORDER BY log_date ASC
");
$stmt->execute(['user_id' => $userId, 'start_date' => $startDate, 'end_date' => $endDate]);
$logs = $stmt->fetchAll();

// Calculate averages
$totalDays = count($logs);
$avgCalories = 0;
$avgProtein = 0;
$avgCarbs = 0;
$avgFat = 0;
$weights = [];

if ($totalDays > 0) {
    $sumCalories = 0;
    $sumProtein = 0;
    $sumCarbs = 0;
    $sumFat = 0;
    
    foreach ($logs as $log) {
        $sumCalories += $log['total_calories'];
        $sumProtein += $log['total_protein'];
        $sumCarbs += $log['total_carbs'];
        $sumFat += $log['total_fat'];
        
        if ($log['weight_kg']) {
            $weights[] = [
                'date' => $log['log_date'],
                'weight' => floatval($log['weight_kg'])
            ];
        }
    }
    
    $avgCalories = round($sumCalories / $totalDays, 1);
    $avgProtein = round($sumProtein / $totalDays, 1);
    $avgCarbs = round($sumCarbs / $totalDays, 1);
    $avgFat = round($sumFat / $totalDays, 1);
}

// Goal adherence
$calorieAdherence = $user['daily_calorie_target'] > 0 
    ? round(($avgCalories / $user['daily_calorie_target']) * 100, 1) 
    : 0;
$proteinAdherence = $user['protein_target'] > 0 
    ? round(($avgProtein / $user['protein_target']) * 100, 1) 
    : 0;

// Weight progress
$weightChange = 0;
$startWeight = null;
$currentWeight = null;

if (count($weights) >= 2) {
    $startWeight = $weights[0]['weight'];
    $currentWeight = $weights[count($weights) - 1]['weight'];
    $weightChange = round($currentWeight - $startWeight, 2);
}

// Chart data (daily breakdown)
$chartData = [
    'labels' => [],
    'calories' => [],
    'protein' => [],
    'carbs' => [],
    'fat' => [],
];

foreach ($logs as $log) {
    $chartData['labels'][] = date('M j', strtotime($log['log_date']));
    $chartData['calories'][] = floatval($log['total_calories']);
    $chartData['protein'][] = floatval($log['total_protein']);
    $chartData['carbs'][] = floatval($log['total_carbs']);
    $chartData['fat'][] = floatval($log['total_fat']);
}

// Top foods consumed
$stmt = $db->prepare("
    SELECT f.name, f.category, COUNT(*) as times_eaten, SUM(dli.grams) as total_grams
    FROM daily_log_items dli
    JOIN daily_logs dl ON dli.daily_log_id = dl.id
    JOIN foods f ON dli.food_id = f.id
    WHERE dl.user_id = :user_id AND dl.log_date BETWEEN :start_date AND :end_date
    GROUP BY f.id
    ORDER BY times_eaten DESC
    LIMIT 10
");
$stmt->execute(['user_id' => $userId, 'start_date' => $startDate, 'end_date' => $endDate]);
$topFoods = $stmt->fetchAll();

jsonResponse([
    'success' => true,
    'data' => [
        'user' => [
            'name' => $user['name'],
            'calorie_target' => $user['daily_calorie_target'],
            'protein_target' => $user['protein_target'],
            'carbs_target' => $user['carbs_target'],
            'fat_target' => $user['fat_target'],
        ],
        'period' => [
            'start' => $startDate,
            'end' => $endDate,
            'days_logged' => $totalDays,
        ],
        'averages' => [
            'calories' => $avgCalories,
            'protein' => $avgProtein,
            'carbs' => $avgCarbs,
            'fat' => $avgFat,
        ],
        'adherence' => [
            'calories_percent' => $calorieAdherence,
            'protein_percent' => $proteinAdherence,
        ],
        'weight' => [
            'start' => $startWeight,
            'current' => $currentWeight,
            'change' => $weightChange,
            'history' => $weights,
        ],
        'chart' => $chartData,
        'top_foods' => $topFoods,
    ]
]);
