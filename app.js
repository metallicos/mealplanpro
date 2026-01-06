/**
 * Meal Planning Application - Main JavaScript
 */

// API Configuration
const API_BASE = './api';

// Global state
let currentUserId = 1;
let currentDate = new Date().toISOString().split('T')[0];
let foods = [];
let dailyLog = null;

// ==========================================
// API Functions
// ==========================================

async function api(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };

    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE}/${endpoint}`, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// ==========================================
// Foods API
// ==========================================

async function searchFoods(query = '', category = '') {
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (category) params.set('category', category);

    const result = await api(`foods.php?${params}`);
    foods = result.data || [];
    return foods;
}

// ==========================================
// Daily Log API
// ==========================================

async function getDailyLog(userId = currentUserId, date = currentDate) {
    const result = await api(`daily-log.php?user_id=${userId}&date=${date}`);
    dailyLog = result.data?.[0] || null;
    return dailyLog;
}

async function addFoodToLog(foodId, grams, mealType = 'main') {
    const result = await api('daily-log.php', 'POST', {
        user_id: currentUserId,
        date: currentDate,
        food_id: foodId,
        grams: grams,
        meal_type: mealType
    });

    if (result.success) {
        showNotification('Food added successfully!', 'success');
        await refreshDailyLog();
    }

    return result;
}

async function removeFoodFromLog(itemId) {
    const result = await api(`daily-log.php?item_id=${itemId}`, 'DELETE');

    if (result.success) {
        showNotification('Food removed', 'success');
        await refreshDailyLog();
    }

    return result;
}

async function updateWeight(weight) {
    return await api('daily-log.php', 'PUT', {
        user_id: currentUserId,
        date: currentDate,
        weight_kg: weight
    });
}

// ==========================================
// Statistics API
// ==========================================

async function getStatistics(period = 'week') {
    return await api(`statistics.php?user_id=${currentUserId}&period=${period}`);
}

// ==========================================
// Users API
// ==========================================

async function getUsers() {
    const result = await api('users.php');
    return result.data || [];
}

async function updateUser(userId, data) {
    return await api('users.php', 'PUT', { id: userId, ...data });
}

// ==========================================
// Groceries API
// ==========================================

async function getGroceries(weekStart = null) {
    const params = weekStart ? `?week_start=${weekStart}` : '';
    const result = await api(`groceries.php${params}`);
    return result.data || [];
}

async function toggleGroceryItem(id, purchased) {
    return await api('groceries.php', 'PUT', { id, is_purchased: purchased });
}

async function addGroceryItem(item) {
    return await api('groceries.php', 'POST', item);
}

async function generateGroceryList(weekStart) {
    return await api('groceries.php', 'POST', { generate: true, week_start: weekStart });
}

// ==========================================
// UI Components
// ==========================================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;

    // Add notification styles if not exists
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 16px 20px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 1000;
                animation: slideIn 0.3s ease;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
            .notification-success { background: #22c55e; color: white; }
            .notification-error { background: #ef4444; color: white; }
            .notification-info { background: #3b82f6; color: white; }
            .notification button {
                background: none;
                border: none;
                color: inherit;
                font-size: 1.5rem;
                cursor: pointer;
                opacity: 0.7;
            }
            .notification button:hover { opacity: 1; }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

function formatNumber(num, decimals = 1) {
    return Number(num).toFixed(decimals);
}

function createStatCard(icon, value, label, target, colorClass) {
    const percent = target > 0 ? Math.min((value / target) * 100, 100) : 0;
    const color = colorClass === 'calories' ? '#ef4444' :
        colorClass === 'protein' ? '#3b82f6' :
            colorClass === 'carbs' ? '#f59e0b' : '#a855f7';

    return `
        <div class="stat-card animate-fade-in">
            <div class="stat-card-header">
                <div class="stat-card-icon ${colorClass}">${icon}</div>
                ${target > 0 ? `<span class="badge badge-${percent >= 90 ? 'success' : 'warning'}">${formatNumber(percent, 0)}%</span>` : ''}
            </div>
            <div class="stat-card-value">${formatNumber(value, 0)}</div>
            <div class="stat-card-label">${label}${target > 0 ? ` / ${target}` : ''}</div>
            ${target > 0 ? `
                <div class="stat-card-progress">
                    <div class="stat-card-progress-bar" style="width: ${percent}%; background: ${color};"></div>
                </div>
            ` : ''}
        </div>
    `;
}

// ==========================================
// Food Search Component
// ==========================================

function initFoodSearch(inputId, resultsId, onSelect) {
    const input = document.getElementById(inputId);
    const results = document.getElementById(resultsId);

    if (!input || !results) return;

    let debounceTimer;

    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();

        if (query.length < 2) {
            results.classList.remove('active');
            return;
        }

        debounceTimer = setTimeout(async () => {
            const foods = await searchFoods(query);

            if (foods.length === 0) {
                results.innerHTML = '<div class="food-search-item">No foods found</div>';
            } else {
                results.innerHTML = foods.map(food => `
                    <div class="food-search-item" data-id="${food.id}">
                        <div>
                            <div class="food-search-item-name">${food.name}</div>
                            <div class="food-search-item-cal">${food.category}</div>
                        </div>
                        <div class="food-search-item-cal">${food.calories_per_100g} kcal/100g</div>
                    </div>
                `).join('');
            }

            results.classList.add('active');
        }, 300);
    });

    results.addEventListener('click', (e) => {
        const item = e.target.closest('.food-search-item');
        if (item && item.dataset.id) {
            const food = foods.find(f => f.id == item.dataset.id);
            if (food && onSelect) {
                onSelect(food);
                input.value = food.name;
                results.classList.remove('active');
            }
        }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.classList.remove('active');
        }
    });
}

// ==========================================
// Charts
// ==========================================

let charts = {};

async function renderCaloriesChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Calories',
                data: data.calories,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#94a3b8' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#64748b' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                y: {
                    ticks: { color: '#64748b' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                }
            }
        }
    });
}

async function renderMacrosPieChart(canvasId, protein, carbs, fat) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Protein', 'Carbs', 'Fat'],
            datasets: [{
                data: [protein, carbs, fat],
                backgroundColor: ['#3b82f6', '#f59e0b', '#a855f7'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', padding: 20 }
                }
            },
            cutout: '70%'
        }
    });
}

// ==========================================
// Calories Calculator
// ==========================================

function calculateTDEE(weight, height, age, gender, activity) {
    // Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'male') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9
    };

    return Math.round(bmr * (activityMultipliers[activity] || 1.2));
}

function calculateMacros(calories, goal = 'fat_loss') {
    // For fat loss: higher protein, moderate carbs, moderate fat
    const proteinPercent = goal === 'fat_loss' ? 0.35 : 0.25;
    const fatPercent = goal === 'fat_loss' ? 0.30 : 0.25;
    const carbsPercent = 1 - proteinPercent - fatPercent;

    return {
        protein: Math.round((calories * proteinPercent) / 4), // 4 cal/g
        carbs: Math.round((calories * carbsPercent) / 4),     // 4 cal/g
        fat: Math.round((calories * fatPercent) / 9)           // 9 cal/g
    };
}

// ==========================================
// User Switching
// ==========================================

function setCurrentUser(userId) {
    currentUserId = userId;
    localStorage.setItem('mealplan_user', userId);

    // Update UI
    document.querySelectorAll('.user-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.userId == userId);
    });

    // Refresh current page data
    if (typeof refreshDailyLog === 'function') {
        refreshDailyLog();
    }
}

// ==========================================
// Navigation
// ==========================================

function initNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            item.classList.add('active');
        }
    });
}

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation
    initNavigation();

    // Restore user selection
    const savedUser = localStorage.getItem('mealplan_user');
    if (savedUser) {
        currentUserId = parseInt(savedUser);
    }

    // Initialize user toggle buttons
    document.querySelectorAll('.user-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.userId == currentUserId);
        btn.addEventListener('click', () => setCurrentUser(btn.dataset.userId));
    });
});
