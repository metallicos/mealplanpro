'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { groceryItemTemplates, categoryNames, searchGroceryItems } from '@/lib/grocery-items';
import type { GroceryItemTemplate } from '@/lib/grocery-items';
import {
    ShoppingCart, Printer, Copy, Search, Filter, Trash2,
    Plus, Check, AlertTriangle, Calendar, DollarSign,
    Package, List, Edit2, Beef, Wheat, Carrot, Apple,
    Milk, Droplet, Utensils, Coffee, Cookie, CakeSlice,
    SprayCan, Smile, Baby, Dog, Box
} from 'lucide-react';

interface GroceryItem extends GroceryItemTemplate {
    id: number;
    quantity: number;
    is_purchased: boolean;
    is_out_of_stock: boolean;
    buy_next_month: boolean;
    comment: string;
    actual_price: number | null;
}

interface MonthlyBudget {
    month: string; // YYYY-MM format
    initial_budget: number;
    spent: number;
    items: GroceryItem[];
}

export default function GroceriesPage() {
    const { theme } = useUser();
    const printRef = useRef<HTMLDivElement>(null);

    // Get current month
    const getCurrentMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
    const [budgets, setBudgets] = useState<Record<string, MonthlyBudget>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [showMultiSelectModal, setShowMultiSelectModal] = useState(false);
    const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
    const [newBudget, setNewBudget] = useState(3000);
    const [customItem, setCustomItem] = useState({
        name: '',
        category: 'other',
        quantity: 1,
        unit: 'pcs',
        price: 0
    });
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterStock, setFilterStock] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
    const [browseCategory, setBrowseCategory] = useState<string>('proteins');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isLoaded, setIsLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load from database
    useEffect(() => {
        const loadBudgets = async () => {
            try {
                const response = await fetch('/api/groceries?user_id=default');
                if (response.ok) {
                    const data = await response.json();
                    if (data && typeof data === 'object') {
                        setBudgets(data);
                    }
                }
            } catch (error) {
                console.error('Failed to load budgets:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadBudgets();
    }, []);

    // Save to database with debounce
    const saveBudget = useCallback(async (month: string, budget: MonthlyBudget) => {
        try {
            setIsSaving(true);
            await fetch('/api/groceries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: 'default',
                    month,
                    initial_budget: budget.initial_budget,
                    items: budget.items,
                }),
            });
        } catch (error) {
            console.error('Failed to save budget:', error);
        } finally {
            setIsSaving(false);
        }
    }, []);

    // Debounced save - only after initial load
    useEffect(() => {
        if (isLoaded && budgets[currentMonth]) {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = setTimeout(() => {
                saveBudget(currentMonth, budgets[currentMonth]);
            }, 500);
        }
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [budgets, currentMonth, isLoaded, saveBudget]);

    // Get or create current month's budget
    const currentBudget = budgets[currentMonth] || {
        month: currentMonth,
        initial_budget: 3000,
        spent: 0,
        items: [],
    };

    const items = currentBudget.items;
    const searchResults = searchQuery ? searchGroceryItems(searchQuery) : [];

    // Filter items
    const filteredItems = items.filter(item => {
        const categoryMatch = filterCategory === 'all' || item.category === filterCategory;
        const stockMatch = filterStock === 'all'
            || (filterStock === 'out_of_stock' && item.is_out_of_stock)
            || (filterStock === 'in_stock' && !item.is_out_of_stock);
        return categoryMatch && stockMatch;
    });

    // Group items by category
    const groupedItems = filteredItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, GroceryItem[]>);

    // Stats
    const totalItems = items.length;
    const purchasedItems = items.filter(i => i.is_purchased).length;
    const outOfStockItems = items.filter(i => i.is_out_of_stock).length;
    const needNextMonth = items.filter(i => i.buy_next_month).length;
    const estimatedCost = items.reduce((sum, i) => sum + (Number(i.estimated_price_per_unit) * Number(i.quantity)), 0);
    const actualSpent = items
        .filter(i => i.is_purchased && i.actual_price !== null && i.actual_price !== undefined)
        .reduce((sum, i) => sum + Number(i.actual_price || 0), 0);
    const remainingBudget = Number(currentBudget.initial_budget) - actualSpent;

    // Update budget
    const updateBudget = (updates: Partial<MonthlyBudget>) => {
        setBudgets(prev => ({
            ...prev,
            [currentMonth]: {
                ...currentBudget,
                ...updates,
            },
        }));
    };

    const setBudgetAmount = () => {
        updateBudget({ initial_budget: newBudget });
        setShowBudgetModal(false);
    };

    const addItemFromTemplate = (template: GroceryItemTemplate) => {
        const newItem: GroceryItem = {
            ...template,
            id: Date.now(),
            quantity: 1,
            is_purchased: false,
            is_out_of_stock: false,
            buy_next_month: false,
            comment: '',
            actual_price: null,
        };
        updateBudget({ items: [...items, newItem] });
        setSearchQuery('');
    };

    // Toggle item in multi-select
    const toggleItemSelection = (itemName: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemName)) {
                newSet.delete(itemName);
            } else {
                newSet.add(itemName);
            }
            return newSet;
        });
    };

    // Add all selected items at once
    const addSelectedItems = () => {
        const newItems = groceryItemTemplates
            .filter(t => selectedItems.has(t.name))
            .map(template => ({
                ...template,
                id: Date.now() + Math.random(),
                quantity: 1,
                is_purchased: false,
                is_out_of_stock: false,
                buy_next_month: false,
                comment: '',
                actual_price: null,
            }));
        updateBudget({ items: [...items, ...newItems] });
        setSelectedItems(new Set());
        setShowMultiSelectModal(false);
    };

    // Get items for a category (for browsing)
    const getCategoryItems = (category: string) => {
        return groceryItemTemplates.filter(t => t.category === category);
    };

    const addCustomItem = () => {
        const newItem: GroceryItem = {
            id: Date.now(),
            name: customItem.name,
            category: customItem.category,
            default_unit: customItem.unit,
            estimated_price_per_unit: customItem.price,
            quantity: customItem.quantity,
            is_purchased: false,
            is_out_of_stock: false,
            buy_next_month: false,
            comment: '',
            actual_price: null,
        };
        updateBudget({ items: [...items, newItem] });
        setShowAddModal(false);
        setCustomItem({ name: '', category: 'other', quantity: 1, unit: 'pcs', price: 0 });
    };

    const updateItem = (id: number, updates: Partial<GroceryItem>) => {
        updateBudget({
            items: items.map(i => i.id === id ? { ...i, ...updates } : i),
        });
    };

    const togglePurchased = (id: number, actualPrice?: number) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        updateItem(id, {
            is_purchased: !item.is_purchased,
            actual_price: !item.is_purchased ? (actualPrice || item.estimated_price_per_unit * item.quantity) : null,
        });
    };

    const removeItem = (id: number) => {
        updateBudget({ items: items.filter(i => i.id !== id) });
    };

    const copyToNextMonth = () => {
        const nextMonthItems = items
            .filter(i => i.buy_next_month)
            .map(i => ({
                ...i,
                id: Date.now() + Math.random(),
                is_purchased: false,
                actual_price: null,
            }));

        // Calculate next month
        const [year, month] = currentMonth.split('-').map(Number);
        const nextMonth = month === 12
            ? `${year + 1}-01`
            : `${year}-${String(month + 1).padStart(2, '0')}`;

        const existingNextMonth = budgets[nextMonth] || {
            month: nextMonth,
            initial_budget: currentBudget.initial_budget,
            spent: 0,
            items: [],
        };

        setBudgets(prev => ({
            ...prev,
            [nextMonth]: {
                ...existingNextMonth,
                items: [...existingNextMonth.items, ...nextMonthItems],
            },
        }));

        alert(`${nextMonthItems.length} items copied to ${nextMonth}!`);
    };

    const clearList = () => {
        if (confirm('Clear all items from this month?')) {
            updateBudget({ items: [] });
        }
    };

    // Print function - opens new window with clean printable HTML
    const handlePrint = () => {
        const printContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Grocery List - ${formatMonth(currentMonth)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 11pt; }
        h1 { text-align: center; margin-bottom: 5px; font-size: 18pt; }
        .subtitle { text-align: center; margin-bottom: 15px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #333; color: white; padding: 8px 10px; text-align: left; font-size: 10pt; }
        td { padding: 6px 10px; border-bottom: 1px solid #ddd; font-size: 10pt; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .category-row td { background: #e0e0e0; font-weight: bold; padding: 10px; }
        .purchased td { color: #888; text-decoration: line-through; }
        .out-of-stock td { background: #ffe0e0 !important; }
        .badge { display: inline-block; padding: 2px 6px; font-size: 8pt; border-radius: 3px; margin-left: 5px; }
        .badge-oos { background: #ffcccc; color: #c00; }
        .badge-next { background: #cce0ff; color: #006; }
        .summary { margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; }
        .summary td { padding: 5px 10px; }
        @media print { body { padding: 10px; } }
    </style>
</head>
<body>
    <h1>GROCERY LIST</h1>
    <p class="subtitle"><strong>${formatMonth(currentMonth)}</strong><br>
    Budget: ${currentBudget.initial_budget.toLocaleString()} MAD | Items: ${totalItems} | Purchased: ${purchasedItems}</p>
    
    <table>
        <thead>
            <tr>
                <th style="width:30px"></th>
                <th>Item</th>
                <th style="width:60px">Qty</th>
                <th style="width:80px">Price</th>
                <th style="width:100px">Status</th>
                <th>Notes</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(groupedItems).map(([category, catItems]) => `
                <tr class="category-row">
                    <td colspan="6">${categoryNames[category] || category} (${catItems.length})</td>
                </tr>
                ${catItems.map(item => `
                    <tr class="${item.is_purchased ? 'purchased' : ''} ${item.is_out_of_stock ? 'out-of-stock' : ''}">
                        <td style="text-align:center">${item.is_purchased ? '[X]' : '[ ]'}</td>
                        <td><strong>${item.name}</strong></td>
                        <td>${item.quantity} ${item.default_unit}</td>
                        <td>${(Number(item.estimated_price_per_unit) * Number(item.quantity)).toFixed(0)} MAD</td>
                        <td>
                            ${item.is_out_of_stock ? '<span class="badge badge-oos">EPUISE</span>' : ''}
                            ${item.buy_next_month ? '<span class="badge badge-next">NEXT</span>' : ''}
                            ${item.actual_price !== null && item.actual_price !== undefined ? `Paid: ${Number(item.actual_price).toFixed(0)}` : ''}
                        </td>
                        <td style="font-size:9pt;font-style:italic">${item.comment || '-'}</td>
                    </tr>
                `).join('')}
            `).join('')}
        </tbody>
    </table>
    
    <table class="summary">
        <tr>
            <td><strong>Estimated:</strong> ${estimatedCost.toLocaleString()} MAD</td>
            <td><strong>Spent:</strong> ${actualSpent.toLocaleString()} MAD</td>
            <td style="text-align:right"><strong>REMAINING: ${remainingBudget.toLocaleString()} MAD</strong></td>
        </tr>
        <tr>
            <td colspan="3" style="font-size:9pt;padding-top:10px">
                Out of Stock: ${outOfStockItems} | Buy Next Month: ${needNextMonth}
            </td>
        </tr>
    </table>
    
    <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
        }
    };

    // Format month for display
    const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Get available months
    const availableMonths = Object.keys(budgets).sort().reverse();
    if (!availableMonths.includes(currentMonth)) {
        availableMonths.unshift(currentMonth);
    }

    // Get all unique categories from current items
    // Category Icon Helper
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'protein': return <Beef className="w-4 h-4" />;
            case 'carbs': return <Wheat className="w-4 h-4" />;
            case 'vegetables': return <Carrot className="w-4 h-4" />;
            case 'fruits': return <Apple className="w-4 h-4" />;
            case 'dairy': return <Milk className="w-4 h-4" />;
            case 'fats': return <Droplet className="w-4 h-4" />;
            case 'condiments': return <Utensils className="w-4 h-4" />;
            case 'herbs': return <Utensils className="w-4 h-4" />;
            case 'beverages': return <Coffee className="w-4 h-4" />;
            case 'snacks': return <Cookie className="w-4 h-4" />;
            case 'baking': return <CakeSlice className="w-4 h-4" />;
            case 'cleaning': return <SprayCan className="w-4 h-4" />;
            case 'personal': return <Smile className="w-4 h-4" />;
            case 'baby': return <Baby className="w-4 h-4" />;
            case 'pets': return <Dog className="w-4 h-4" />;
            default: return <Box className="w-4 h-4" />;
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Print styles - Simple table format */}
            <style jsx global>{`
        @media print {
          /* Hide everything except print area */
          body > *:not(.print-area),
          .no-print,
          nav,
          aside,
          button,
          .sidebar,
          header,
          .animate-fade-in > *:not(.print-container) {
            display: none !important;
          }
          
          /* Reset styles */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            background: white !important;
            color: black !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 11pt !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Print container */
          .print-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            padding: 15mm !important;
            background: white !important;
            z-index: 99999 !important;
          }
          
          /* Hide screen-only content */
          .screen-only {
            display: none !important;
          }
          
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
          }
          
          .print-table th {
            background: #333 !important;
            color: white !important;
            padding: 8px 10px !important;
            text-align: left !important;
            font-weight: bold !important;
            font-size: 10pt !important;
          }
          
          .print-table td {
            padding: 6px 10px !important;
            border-bottom: 1px solid #ddd !important;
            font-size: 10pt !important;
            vertical-align: top !important;
          }
          
          .print-table tr:nth-child(even) td {
            background: #f9f9f9 !important;
          }
          
          .print-table .category-row td {
            background: #e0e0e0 !important;
            font-weight: bold !important;
            padding: 10px !important;
          }
          
          .print-table .purchased td {
            color: #888 !important;
            text-decoration: line-through !important;
          }
          
          .print-table .out-of-stock td {
            background: #ffe0e0 !important;
          }
          
          .status-badge {
            display: inline-block !important;
            padding: 2px 6px !important;
            font-size: 8pt !important;
            border-radius: 3px !important;
            margin-left: 5px !important;
          }
          
          .status-oos {
            background: #ffcccc !important;
            color: #c00 !important;
          }
          
          .status-next {
            background: #cce0ff !important;
            color: #006 !important;
          }
          
          .print-summary-table {
            width: 100% !important;
            margin-top: 20px !important;
            border-top: 2px solid #333 !important;
            padding-top: 10px !important;
          }
          
          .print-summary-table td {
            padding: 5px 0 !important;
          }
          
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>

            <div className="mb-8 no-print">
                <div className="flex items-center gap-3">
                    <h1 className="page-title flex items-center gap-3">
                        <ShoppingCart className="w-8 h-8 text-[var(--accent-primary)]" />
                        Grocery & Budget Manager
                    </h1>
                    {isSaving && (
                        <span className="text-sm px-2 py-1 rounded bg-blue-500/20 text-blue-400 animate-pulse">
                            Saving...
                        </span>
                    )}
                    {isLoaded && !isSaving && (
                        <span className="text-sm px-2 py-1 rounded bg-green-500/20 text-green-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Saved
                        </span>
                    )}
                </div>
                <p className="page-subtitle">Data is automatically saved. Switch months to view history.</p>
            </div>

            {/* Month & Budget Bar */}
            <div className="card mb-4 no-print">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <label className="form-label text-xs sm:text-sm">Month</label>
                            <select
                                className="form-input text-sm"
                                value={currentMonth}
                                onChange={(e) => setCurrentMonth(e.target.value)}
                            >
                                {availableMonths.map(m => (
                                    <option key={m} value={m}>{formatMonth(m)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1">
                            <label className="form-label text-xs sm:text-sm">Budget</label>
                            <div className="flex items-center gap-2">
                                <div
                                    className="text-lg sm:text-2xl font-bold cursor-pointer hover:opacity-80"
                                    style={{ color: theme.primary }}
                                    onClick={() => {
                                        setNewBudget(currentBudget.initial_budget);
                                        setShowBudgetModal(true);
                                    }}
                                >
                                    {currentBudget.initial_budget.toLocaleString()} MAD
                                </div>
                                <button
                                    onClick={() => {
                                        setNewBudget(currentBudget.initial_budget);
                                        setShowBudgetModal(true);
                                    }}
                                    className="text-sm opacity-60 hover:opacity-100 hidden sm:inline"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 sm:ml-auto">
                        <button onClick={handlePrint} className="btn-secondary flex-1 sm:flex-none text-sm flex items-center justify-center gap-2">
                            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Print</span>
                        </button>
                        <button onClick={copyToNextMonth} className="btn-secondary flex-1 sm:flex-none text-sm flex items-center justify-center gap-2">
                            <Copy className="w-4 h-4" /> <span className="hidden sm:inline">Copy</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Budget Overview */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 no-print">
                <div className="stat-card">
                    <div className="stat-value">{totalItems}</div>
                    <div className="stat-label">Total Items</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--success)' }}>{purchasedItems}</div>
                    <div className="stat-label">Purchased</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--error)' }}>{outOfStockItems}</div>
                    <div className="stat-label">Out of Stock</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--warning)' }}>{needNextMonth}</div>
                    <div className="stat-label">Buy Next Month</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{actualSpent.toLocaleString()}</div>
                    <div className="stat-label">Spent (MAD)</div>
                </div>
                <div className="stat-card">
                    <div
                        className="stat-value"
                        style={{ color: remainingBudget >= 0 ? 'var(--success)' : 'var(--error)' }}
                    >
                        {remainingBudget.toLocaleString()}
                    </div>
                    <div className="stat-label">Remaining (MAD)</div>
                </div>
            </div>

            {/* Budget Progress Bar */}
            <div className="card mb-6 no-print">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Budget Usage</span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {Math.round((actualSpent / currentBudget.initial_budget) * 100)}% used
                    </span>
                </div>
                <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${Math.min((actualSpent / currentBudget.initial_budget) * 100, 100)}%`,
                            background: actualSpent > currentBudget.initial_budget
                                ? 'var(--error)'
                                : theme.gradient
                        }}
                    />
                </div>
                <div className="flex justify-between text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                    <span>Est. Total: {estimatedCost.toLocaleString()} MAD</span>
                    <span>Budget: {currentBudget.initial_budget.toLocaleString()} MAD</span>
                </div>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Add Items Panel */}
                <div className="order-2 lg:order-1 lg:col-span-1 no-print">
                    <div className="card lg:sticky lg:top-4">
                        <h3 className="font-semibold mb-3 text-sm sm:text-base">Add Items</h3>

                        {/* Search */}
                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Search 300+ items..."
                                className="form-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />

                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg max-h-60 overflow-y-auto z-10">
                                    {searchResults.slice(0, 15).map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => addItemFromTemplate(item)}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center justify-between text-sm"
                                        >
                                            <span className="flex items-center gap-2">
                                                {getCategoryIcon(item.category)} {item.name}
                                            </span>
                                            <span className="text-gray-500">
                                                {item.estimated_price_per_unit} MAD/{item.default_unit}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn-secondary w-full mb-2 flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add Custom Item
                        </button>

                        <button
                            onClick={() => setShowMultiSelectModal(true)}
                            className="btn-primary w-full mb-4"
                        >
                            Browse & Select Multiple
                        </button>

                        {/* Filter by Category */}
                        <div className="mb-4">
                            <label className="form-label">Filter by Category</label>
                            <select
                                className="form-input"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="all">All Categories</option>
                                {Object.entries(categoryNames).map(([key, name]) => (
                                    <option key={key} value={key}>{name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filter by Stock */}
                        <div className="mb-4">
                            <label className="form-label">Stock Status</label>
                            <select
                                className="form-input"
                                value={filterStock}
                                onChange={(e) => setFilterStock(e.target.value as any)}
                            >
                                <option value="all">All Items</option>
                                <option value="out_of_stock">Out of Stock Only</option>
                                <option value="in_stock">In Stock Only</option>
                            </select>
                        </div>

                        <button
                            onClick={clearList}
                            className="btn-secondary w-full text-red-400 border-red-400/30 hover:bg-red-400/10 flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Clear All
                        </button>
                    </div>
                </div>

                {/* Shopping List */}
                <div className="order-1 lg:order-2 lg:col-span-2">
                    <div className="card print-area" ref={printRef}>
                        {/* Print Header */}
                        <div className="print-header hidden">
                            <h1 className="flex items-center gap-2"><ShoppingCart className="w-6 h-6" /> Grocery List</h1>
                            <p><strong>{formatMonth(currentMonth)}</strong></p>
                            <p>Budget: {currentBudget.initial_budget.toLocaleString()} MAD | Items: {totalItems} | Purchased: {purchasedItems}</p>
                        </div>

                        <div className="flex items-center justify-between mb-4 no-print">
                            <h3 className="font-semibold">Shopping List</h3>
                            <span className="badge badge-primary">
                                {purchasedItems}/{totalItems} done
                            </span>
                        </div>

                        {items.length === 0 ? (
                            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                                <div className="text-5xl mb-4 flex justify-center"><ShoppingCart className="w-16 h-16 opacity-50" /></div>
                                <p>No items yet. Search and add some groceries!</p>
                            </div>
                        ) : (
                            Object.entries(groupedItems).map(([category, categoryItems]) => (
                                <div key={category} className="mb-6">
                                    <h4 className="print-category text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                                        {getCategoryIcon(category)} {categoryNames[category] || category}
                                        <span className="badge badge-primary text-xs no-print">{categoryItems.length}</span>
                                    </h4>
                                    <div className="space-y-2">
                                        {categoryItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`print-item p-3 rounded-lg border transition-all ${item.is_purchased
                                                    ? 'opacity-50 border-green-500/30 bg-green-500/5'
                                                    : item.is_out_of_stock
                                                        ? 'border-red-500/30 bg-red-500/5'
                                                        : 'border-gray-700 bg-gray-800/50'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Print Checkbox (visible in print only) */}
                                                    <div className={`print-checkbox hidden ${item.is_purchased ? 'checked' : ''}`} />

                                                    {/* Interactive Checkbox (hidden in print) */}
                                                    <div
                                                        className={`w-6 h-6 mt-0.5 rounded flex items-center justify-center cursor-pointer border-2 shrink-0 no-print ${item.is_purchased
                                                            ? 'bg-green-500 border-green-500'
                                                            : 'border-gray-600 hover:border-gray-400'
                                                            }`}
                                                        onClick={() => togglePurchased(item.id)}
                                                    >
                                                        {item.is_purchased && '✓'}
                                                    </div>

                                                    {/* Item details */}
                                                    <div className="print-item-content flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`print-item-name font-medium ${item.is_purchased ? 'line-through purchased' : ''}`}>
                                                                {item.name}
                                                            </span>
                                                            <span className="print-item-badges">
                                                                {item.is_out_of_stock && (
                                                                    <span className="print-badge print-badge-oos text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                                                                        ÉPUISÉ
                                                                    </span>
                                                                )}
                                                                {item.buy_next_month && (
                                                                    <span className="print-badge print-badge-next text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                                                        NEXT
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="print-item-details text-sm flex items-center gap-3 mt-1" style={{ color: 'var(--text-muted)' }}>
                                                            <span>{item.quantity} {item.default_unit}</span>
                                                            <span>
                                                                {(item.estimated_price_per_unit * item.quantity).toFixed(0)} MAD
                                                            </span>
                                                            {item.actual_price !== null && item.actual_price !== undefined && (
                                                                <span style={{ color: 'var(--success)' }}>
                                                                    (Paid: {Number(item.actual_price).toFixed(0)} MAD)
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.comment && (
                                                            <div className="print-item-comment text-sm mt-1 italic" style={{ color: theme.primary }}>
                                                                → {item.comment}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions (hidden in print) */}
                                                    <div className="flex items-center gap-1 no-print">
                                                        <button
                                                            onClick={() => setEditingItem(item)}
                                                            className="p-1 hover:bg-gray-700 rounded"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => removeItem(item.id)}
                                                            className="p-1 hover:bg-gray-700 rounded text-red-400"
                                                            title="Remove"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Print Footer */}
                        <div className="print-footer hidden">
                            <div className="print-summary">
                                <span>Estimated Total: <strong>{estimatedCost.toLocaleString()} MAD</strong></span>
                                <span>Spent: <strong>{actualSpent.toLocaleString()} MAD</strong></span>
                                <span className="print-total">Remaining: {remainingBudget.toLocaleString()} MAD</span>
                            </div>
                            <p style={{ marginTop: '10px', fontSize: '9pt' }}>
                                Out of Stock: {outOfStockItems} items | Buy Next Month: {needNextMonth} items
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Custom Item Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 no-print">
                    <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4">Add Custom Item</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="form-label">Item Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g., Special ingredient"
                                    value={customItem.name}
                                    onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Quantity</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="1"
                                        value={customItem.quantity}
                                        onChange={(e) => setCustomItem({ ...customItem, quantity: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Unit</label>
                                    <select
                                        className="form-input"
                                        value={customItem.unit}
                                        onChange={(e) => setCustomItem({ ...customItem, unit: e.target.value })}
                                    >
                                        <option value="kg">kg</option>
                                        <option value="g">g</option>
                                        <option value="pcs">pcs</option>
                                        <option value="L">L</option>
                                        <option value="ml">ml</option>
                                        <option value="pack">pack</option>
                                        <option value="bottle">bottle</option>
                                        <option value="box">box</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="form-label">Category</label>
                                <select
                                    className="form-input"
                                    value={customItem.category}
                                    onChange={(e) => setCustomItem({ ...customItem, category: e.target.value })}
                                >
                                    {Object.entries(categoryNames).map(([key, name]) => (
                                        <option key={key} value={key}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="form-label">Est. Price (MAD)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    min="0"
                                    step="0.5"
                                    value={customItem.price}
                                    onChange={(e) => setCustomItem({ ...customItem, price: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">
                                Cancel
                            </button>
                            <button onClick={addCustomItem} className="btn-primary flex-1" disabled={!customItem.name}>
                                Add Item
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Budget Modal */}
            {showBudgetModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 no-print">
                    <div className="card max-w-sm w-full">
                        <h3 className="text-lg font-semibold mb-4">Set Monthly Budget</h3>

                        <div>
                            <label className="form-label">Budget for {formatMonth(currentMonth)} (MAD)</label>
                            <input
                                type="number"
                                className="form-input"
                                min="0"
                                step="100"
                                value={newBudget}
                                onChange={(e) => setNewBudget(parseInt(e.target.value) || 0)}
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowBudgetModal(false)} className="btn-secondary flex-1">
                                Cancel
                            </button>
                            <button onClick={setBudgetAmount} className="btn-primary flex-1">
                                Save Budget
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Item Modal */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 no-print">
                    <div className="card max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Edit: {editingItem.name}</h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Quantity</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="1"
                                        value={editingItem.quantity}
                                        onChange={(e) => setEditingItem({
                                            ...editingItem,
                                            quantity: parseInt(e.target.value) || 1
                                        })}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Actual Price (MAD)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        placeholder="Enter after purchase"
                                        value={editingItem.actual_price || ''}
                                        onChange={(e) => setEditingItem({
                                            ...editingItem,
                                            actual_price: e.target.value ? parseFloat(e.target.value) : null
                                        })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="form-label">Comment / Notes</label>
                                <textarea
                                    className="form-input"
                                    rows={2}
                                    placeholder="e.g., Buy from specific store, check quality..."
                                    value={editingItem.comment}
                                    onChange={(e) => setEditingItem({
                                        ...editingItem,
                                        comment: e.target.value
                                    })}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingItem.is_out_of_stock}
                                        onChange={(e) => setEditingItem({
                                            ...editingItem,
                                            is_out_of_stock: e.target.checked
                                        })}
                                    />
                                    <span className="text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Out of Stock (Épuisé)</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingItem.buy_next_month}
                                        onChange={(e) => setEditingItem({
                                            ...editingItem,
                                            buy_next_month: e.target.checked
                                        })}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm">📅 Buy Next Month</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setEditingItem(null)} className="btn-secondary flex-1">
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    updateItem(editingItem.id, editingItem);
                                    setEditingItem(null);
                                }}
                                className="btn-primary flex-1"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Multi-Select Modal */}
            {showMultiSelectModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 no-print">
                    <div className="card max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Browse & Select Items</h3>
                            <span className="badge badge-primary">
                                {selectedItems.size} selected
                            </span>
                        </div>

                        {/* Category Tabs */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {Object.entries(categoryNames).map(([key, name]) => (
                                <button
                                    key={key}
                                    onClick={() => setBrowseCategory(key)}
                                    className={`px-3 py-1 rounded text-sm transition-all ${browseCategory === key
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-gray-700 hover:bg-gray-600'
                                        }`}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>

                        {/* Items Grid */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-2">
                                {getCategoryItems(browseCategory).map((item) => {
                                    const isSelected = selectedItems.has(item.name);
                                    const alreadyAdded = items.some(i => i.name === item.name);

                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => !alreadyAdded && toggleItemSelection(item.name)}
                                            disabled={alreadyAdded}
                                            className={`p-3 rounded-lg border text-left transition-all ${alreadyAdded
                                                ? 'opacity-40 cursor-not-allowed border-gray-700'
                                                : isSelected
                                                    ? 'border-purple-500 bg-purple-500/20'
                                                    : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected
                                                    ? 'bg-purple-500 border-purple-500 text-white'
                                                    : 'border-gray-500'
                                                    }`}>
                                                    {isSelected && '✓'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm truncate">
                                                        {item.name}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {item.estimated_price_per_unit} MAD/{item.default_unit}
                                                        {alreadyAdded && ' (already added)'}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-700">
                            <button
                                onClick={() => {
                                    setShowMultiSelectModal(false);
                                    setSelectedItems(new Set());
                                }}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addSelectedItems}
                                className="btn-primary flex-1"
                                disabled={selectedItems.size === 0}
                            >
                                Add {selectedItems.size} Items
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print-only table - hidden on screen, visible when printing */}
            <div className="print-container" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <h1 style={{ textAlign: 'center', marginBottom: '5px', fontSize: '18pt' }}>GROCERY LIST</h1>
                <p style={{ textAlign: 'center', marginBottom: '5px' }}>
                    <strong>{formatMonth(currentMonth)}</strong>
                </p>
                <p style={{ textAlign: 'center', marginBottom: '15px', fontSize: '10pt' }}>
                    Budget: {currentBudget.initial_budget.toLocaleString()} MAD |
                    Items: {totalItems} |
                    Purchased: {purchasedItems}
                </p>

                <table className="print-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30px' }}></th>
                            <th>Item</th>
                            <th style={{ width: '60px' }}>Qty</th>
                            <th style={{ width: '80px' }}>Est. Price</th>
                            <th style={{ width: '120px' }}>Status</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(groupedItems).map(([category, categoryItems]) => (
                            <React.Fragment key={category}>
                                <tr className="category-row">
                                    <td colSpan={6}>{categoryNames[category] || category} ({categoryItems.length})</td>
                                </tr>
                                {categoryItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        className={`${item.is_purchased ? 'purchased' : ''} ${item.is_out_of_stock ? 'out-of-stock' : ''}`}
                                    >
                                        <td style={{ textAlign: 'center' }}>
                                            {item.is_purchased ? '[X]' : '[ ]'}
                                        </td>
                                        <td>
                                            <strong>{item.name}</strong>
                                        </td>
                                        <td>{item.quantity} {item.default_unit}</td>
                                        <td>{(Number(item.estimated_price_per_unit) * Number(item.quantity)).toFixed(0)} MAD</td>
                                        <td>
                                            {item.is_out_of_stock && <span className="status-badge status-oos">EPUISE</span>}
                                            {item.buy_next_month && <span className="status-badge status-next">NEXT</span>}
                                            {item.actual_price !== null && item.actual_price !== undefined && `Paid: ${Number(item.actual_price).toFixed(0)}`}
                                        </td>
                                        <td style={{ fontSize: '9pt', fontStyle: 'italic' }}>{item.comment || '-'}</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>

                <table className="print-summary-table">
                    <tbody>
                        <tr>
                            <td><strong>Estimated Total:</strong> {estimatedCost.toLocaleString()} MAD</td>
                            <td><strong>Spent:</strong> {actualSpent.toLocaleString()} MAD</td>
                            <td style={{ textAlign: 'right' }}><strong>REMAINING: {remainingBudget.toLocaleString()} MAD</strong></td>
                        </tr>
                        <tr>
                            <td colSpan={3} style={{ fontSize: '9pt', paddingTop: '10px' }}>
                                Out of Stock: {outOfStockItems} | Buy Next Month: {needNextMonth}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
