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
    SprayCan, Smile, Baby, Dog, Box, Scan, X, Info
} from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';
import BarcodeScanner from '@/components/BarcodeScanner';

interface GroceryItem extends Omit<GroceryItemTemplate, 'id'> {
    id: number;
    template_id?: string;
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

import { useTranslations } from 'next-intl';

export default function GroceriesPage() {
    const t = useTranslations('groceries');
    const { theme, settings } = useUser();
    const printRef = useRef<HTMLDivElement>(null);

    // Currency formatter
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(settings.currency === 'MAD' ? 'fr-MA' : 'en-US', {
            style: 'currency',
            currency: settings.currency || 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Helper to get translated item name
    const getItemName = (item: GroceryItem | GroceryItemTemplate) => {
        // If it has a template_id, try to translate it
        if ('template_id' in item && item.template_id) {
            return t(`items.${item.template_id}`);
        }
        // If it's a template (from search), use its id
        // We know GroceryItemTemplate has id as string, GroceryItem has id as number
        if ('id' in item && typeof item.id === 'string') {
            return t(`items.${item.id}`);
        }
        // Fallback to name (custom items or missing translation)
        return item.name;
    };

    // Helper to get translated category name
    const getCategoryName = (categoryKey: string) => {
        // Try to translate the category key
        const translated = t(`categories.${categoryKey}`);
        // If translation returns the key (meaning missing), fallback to English map or key
        if (translated === `categories.${categoryKey}`) {
            return categoryNames[categoryKey] || categoryKey;
        }
        return translated;
    };

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
    const [showScanner, setShowScanner] = useState(false);
    const [scannedBeautyProduct, setScannedBeautyProduct] = useState<any | null>(null);
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
            template_id: template.id,
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

        alert(`${nextMonthItems.length} ${t('itemsCopied')} ${nextMonth}!`);
    };

    const clearList = () => {
        if (confirm(t('confirmClear'))) {
            updateBudget({ items: [] });
        }
    };

    // Print function - opens new window with clean printable HTML
    const handlePrint = () => {
        const printContent = `
<!DOCTYPE html>
<html>
<head>
    <title>${t('printTitle')} - ${formatMonth(currentMonth)}</title>
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
    <h1>${t('printTitle')}</h1>
    <p class="subtitle"><strong>${formatMonth(currentMonth)}</strong><br>
    ${t('printBudget')
                .replace('{budget}', formatCurrency(currentBudget.initial_budget))
                .replace('{items}', totalItems.toString())
                .replace('{purchased}', purchasedItems.toString())}</p>
    
    <table>
        <thead>
            <tr>
                <th style="width:30px"></th>
                <th>${t('item')}</th>
                <th style="width:60px">${t('qty')}</th>
                <th style="width:80px">${t('price')}</th>
                <th style="width:100px">${t('status')}</th>
                <th>${t('notes')}</th>
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
                        <td>${formatCurrency(Number(item.estimated_price_per_unit) * Number(item.quantity))}</td>
                        <td>
                            ${item.is_out_of_stock ? `<span class="badge badge-oos">${t('outOfStock').toUpperCase()}</span>` : ''}
                            ${item.buy_next_month ? `<span class="badge badge-next">${t('buyNextMonth').toUpperCase()}</span>` : ''}
                            ${item.actual_price !== null && item.actual_price !== undefined ? `${t('paid')}: ${formatCurrency(Number(item.actual_price))}` : ''}
                        </td>
                        <td style="font-size:9pt;font-style:italic">${item.comment || '-'}</td>
                    </tr>
                `).join('')}
            `).join('')}
        </tbody>
    </table>
    
    <table class="summary">
        <tr>
            <td><strong>${t('printEst')}:</strong> ${formatCurrency(estimatedCost)}</td>
            <td><strong>${t('printSpent')}:</strong> ${formatCurrency(actualSpent)}</td>
            <td style="text-align:right"><strong>${t('printRemaining')}: ${formatCurrency(remainingBudget)}</strong></td>
        </tr>
        <tr>
            <td colspan="3" style="font-size:9pt;padding-top:10px">
                ${t('printOos').replace('{oos}', outOfStockItems.toString()).replace('{next}', needNextMonth.toString())}
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
                        {t('title')}
                    </h1>
                    {isSaving && (
                        <span className="text-sm px-2 py-1 rounded bg-blue-500/20 text-blue-400 animate-pulse">
                            {t('saving')}
                        </span>
                    )}
                    {isLoaded && !isSaving && (
                        <span className="text-sm px-2 py-1 rounded bg-green-500/20 text-green-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> {t('saved')}
                        </span>
                    )}
                </div>
                <p className="page-subtitle">{t('subtitle')}</p>
            </div>

            {/* Month & Budget Bar */}
            <div className="card mb-4 no-print">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <label className="form-label text-xs sm:text-sm">{t('month')}</label>
                            <CustomSelect
                                value={currentMonth}
                                onChange={(value) => setCurrentMonth(value)}
                                options={availableMonths.map(m => ({ value: m, label: formatMonth(m) }))}
                                className="min-w-[160px]"
                            />
                        </div>

                        <div className="flex-1">
                            <label className="form-label text-xs sm:text-sm">{t('budget')}</label>
                            <div className="flex items-center gap-2">
                                <div
                                    className="text-lg sm:text-2xl font-bold cursor-pointer hover:opacity-80"
                                    style={{ color: theme.primary }}
                                    onClick={() => {
                                        setNewBudget(currentBudget.initial_budget);
                                        setShowBudgetModal(true);
                                    }}
                                >
                                    {formatCurrency(currentBudget.initial_budget)}
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
                        <button
                            onClick={() => setShowScanner(true)}
                            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl flex-1 sm:flex-none text-sm flex items-center justify-center gap-2 px-4 shadow-lg shadow-pink-900/40 hover:scale-105 transition-transform group"
                        >
                            <Scan className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            <span className="hidden sm:inline">Check Product</span>
                        </button>
                        <button onClick={handlePrint} className="btn-secondary flex-1 sm:flex-none text-sm flex items-center justify-center gap-2">
                            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">{t('print')}</span>
                        </button>
                        <button onClick={copyToNextMonth} className="btn-secondary flex-1 sm:flex-none text-sm flex items-center justify-center gap-2">
                            <Copy className="w-4 h-4" /> <span className="hidden sm:inline">{t('copy')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Budget Overview */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 no-print">
                <div className="stat-card">
                    <div className="stat-value">{totalItems}</div>
                    <div className="stat-label">{t('totalItems')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--success)' }}>{purchasedItems}</div>
                    <div className="stat-label">{t('purchased')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--error)' }}>{outOfStockItems}</div>
                    <div className="stat-label">{t('outOfStock')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--warning)' }}>{needNextMonth}</div>
                    <div className="stat-label">{t('buyNextMonth')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{formatCurrency(actualSpent)}</div>
                    <div className="stat-label">{t('spent')}</div>
                </div>
                <div className="stat-card">
                    <div
                        className="stat-value"
                        style={{ color: remainingBudget >= 0 ? 'var(--success)' : 'var(--error)' }}
                    >
                        {formatCurrency(remainingBudget)}
                    </div>
                    <div className="stat-label">{t('remaining')}</div>
                </div>
            </div>

            {/* Budget Progress Bar */}
            <div className="card mb-6 no-print">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{t('budgetUsage')}</span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {Math.round((actualSpent / currentBudget.initial_budget) * 100)}{t('used')}
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
                    <span>{t('estTotal')}: {formatCurrency(estimatedCost)}</span>
                    <span>{t('budget')}: {formatCurrency(currentBudget.initial_budget)}</span>
                </div>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Add Items Panel */}
                <div className="order-2 lg:order-1 lg:col-span-1 no-print">
                    <div className="card lg:sticky lg:top-4">
                        <h3 className="font-semibold mb-3 text-sm sm:text-base">{t('addItemsTitle')}</h3>

                        {/* Search */}
                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder={t('searchPlaceholder')}
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
                                                {getCategoryIcon(item.category)} {getItemName(item)}
                                            </span>
                                            <span className="text-gray-500">
                                                {formatCurrency(item.estimated_price_per_unit)}/{item.default_unit}
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
                            <Plus className="w-4 h-4" /> {t('addCustomItem')}
                        </button>

                        <button
                            onClick={() => setShowMultiSelectModal(true)}
                            className="btn-primary w-full mb-4"
                        >
                            {t('browseMultiple')}
                        </button>

                        {/* Filter by Category */}
                        <div className="mb-4">
                            <label className="form-label">{t('filterCategory')}</label>
                            <CustomSelect
                                value={filterCategory}
                                onChange={(value) => setFilterCategory(value)}
                                options={[
                                    { value: 'all', label: t('allCategories') },
                                    ...Object.keys(categoryNames).map(key => ({ value: key, label: getCategoryName(key) }))
                                ]}
                            />
                        </div>

                        {/* Filter by Stock */}
                        <div className="mb-4">
                            <label className="form-label">{t('filterStock')}</label>
                            <CustomSelect
                                value={filterStock}
                                onChange={(value) => setFilterStock(value as any)}
                                options={[
                                    { value: 'all', label: t('stockAll') },
                                    { value: 'out_of_stock', label: t('stockOut') },
                                    { value: 'in_stock', label: t('stockIn') }
                                ]}
                            />
                        </div>

                        <button
                            onClick={clearList}
                            className="btn-secondary w-full text-red-400 border-red-400/30 hover:bg-red-400/10 flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> {t('clearAll')}
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
                            <h3 className="font-semibold">{t('shoppingList')}</h3>
                            <span className="badge badge-primary">
                                {purchasedItems}/{totalItems} {t('done')}
                            </span>
                        </div>

                        {items.length === 0 ? (
                            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                                <div className="text-5xl mb-4 flex justify-center"><ShoppingCart className="w-16 h-16 opacity-50" /></div>
                                <p>{t('noItems')}</p>
                            </div>
                        ) : (
                            Object.entries(groupedItems).map(([category, categoryItems]) => (
                                <div key={category} className="mb-6">
                                    <h4 className="print-category text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                                        {getCategoryIcon(category)} {getCategoryName(category)}
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
                                                                {getItemName(item)}
                                                            </span>
                                                            <span className="print-item-badges">
                                                                {item.is_out_of_stock && (
                                                                    <span className="print-badge print-badge-oos text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                                                                        {t('outOfStock').toUpperCase()}
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
                                                                {formatCurrency(item.estimated_price_per_unit * item.quantity)}
                                                            </span>
                                                            {item.actual_price !== null && item.actual_price !== undefined && (
                                                                <span style={{ color: 'var(--success)' }}>
                                                                    (Paid: {formatCurrency(Number(item.actual_price))})
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
                                <span>Estimated Total: <strong>{formatCurrency(estimatedCost)}</strong></span>
                                <span>Spent: <strong>{formatCurrency(actualSpent)}</strong></span>
                                <span className="print-total">Remaining: {formatCurrency(remainingBudget)}</span>
                            </div>
                            <p style={{ marginTop: '10px', fontSize: '9pt' }}>
                                {t('outOfStock')}: {outOfStockItems} {t('item').toLowerCase()}(s) | {t('buyNextMonth')}: {needNextMonth} {t('item').toLowerCase()}(s)
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Custom Item Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 no-print">
                    <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4">{t('addCustomItem')}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="form-label">{t('itemName')}</label>
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
                                    <label className="form-label">{t('qty')}</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="1"
                                        value={customItem.quantity}
                                        onChange={(e) => setCustomItem({ ...customItem, quantity: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">{t('unit')}</label>
                                    <CustomSelect
                                        value={customItem.unit}
                                        onChange={(value) => setCustomItem({ ...customItem, unit: value })}
                                        options={['kg', 'g', 'pcs', 'L', 'ml', 'pack', 'bottle', 'box'].map(u => ({ value: u, label: u }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="form-label">{t('category')}</label>
                                <CustomSelect
                                    value={customItem.category}
                                    onChange={(value) => setCustomItem({ ...customItem, category: value })}
                                    options={Object.keys(categoryNames).map(key => ({ value: key, label: getCategoryName(key) }))}
                                />
                            </div>

                            <div>
                                <label className="form-label">{t('estPrice')} ({formatCurrency(0).replace('0.00', '').trim()})</label>
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
                                {t('cancel')}
                            </button>
                            <button onClick={addCustomItem} className="btn-primary flex-1" disabled={!customItem.name}>
                                {t('addItem')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Budget Modal */}
            {showBudgetModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 no-print">
                    <div className="card max-w-sm w-full">
                        <h3 className="text-lg font-semibold mb-4">{t('setBudgetTitle')}</h3>

                        <div>
                            <label className="form-label">{t('budgetFor')} {formatMonth(currentMonth)} ({formatCurrency(0).replace('0.00', '').trim()})</label>
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
                                {t('cancel')}
                            </button>
                            <button onClick={setBudgetAmount} className="btn-primary flex-1">
                                {t('saveBudget')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Item Modal */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 no-print">
                    <div className="card max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">{t('editTitle')}: {getItemName(editingItem)}</h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">{t('qty')}</label>
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
                                    <label className="form-label">{t('actualPrice')} ({formatCurrency(0).replace('0.00', '').trim()})</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        placeholder={t('enterAfterPurchase')}
                                        value={editingItem.actual_price || ''}
                                        onChange={(e) => setEditingItem({
                                            ...editingItem,
                                            actual_price: e.target.value ? parseFloat(e.target.value) : null
                                        })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="form-label">{t('commentLabel')}</label>
                                <textarea
                                    className="form-input"
                                    rows={2}
                                    placeholder={t('commentPlaceholder')}
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
                                    <span className="text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {t('outOfStock')}</span>
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
                                    <span className="text-sm">📅 {t('buyNextMonth')}</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setEditingItem(null)} className="btn-secondary flex-1">
                                {t('cancel')}
                            </button>
                            <button
                                onClick={() => {
                                    updateItem(editingItem.id, editingItem);
                                    setEditingItem(null);
                                }}
                                className="btn-primary flex-1"
                            >
                                {t('saveChanges')}
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
                            <h3 className="text-lg font-semibold">{t('browseTitle')}</h3>
                            <span className="badge badge-primary">
                                {selectedItems.size} {t('selected')}
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
                                                        {formatCurrency(item.estimated_price_per_unit)}/{item.default_unit}
                                                        {alreadyAdded && ` ${t('alreadyAdded')}`}
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
                                {t('cancel')}
                            </button>
                            <button
                                onClick={addSelectedItems}
                                className="btn-primary flex-1"
                                disabled={selectedItems.size === 0}
                            >
                                {t('addNItems').replace('{count}', selectedItems.size.toString())}
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
                    Budget: {formatCurrency(currentBudget.initial_budget)} |
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
                                        <td>{formatCurrency(Number(item.estimated_price_per_unit) * Number(item.quantity))}</td>
                                        <td>
                                            {item.is_out_of_stock && <span className="status-badge status-oos">EPUISE</span>}
                                            {item.buy_next_month && <span className="status-badge status-next">NEXT</span>}
                                            {item.actual_price !== null && item.actual_price !== undefined && `Paid: ${formatCurrency(Number(item.actual_price))}`}
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
                            <td><strong>Estimated Total:</strong> {formatCurrency(estimatedCost)}</td>
                            <td><strong>Spent:</strong> {formatCurrency(actualSpent)}</td>
                            <td style={{ textAlign: 'right' }}><strong>REMAINING: {formatCurrency(remainingBudget)}</strong></td>
                        </tr>
                        <tr>
                            <td colSpan={3} style={{ fontSize: '9pt', paddingTop: '10px' }}>
                                Out of Stock: {outOfStockItems} | Buy Next Month: {needNextMonth}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Cosmetic Scanner Modal */}
            {
                showScanner && (
                    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
                        <BarcodeScanner
                            onScanResult={(data) => {
                                setScannedBeautyProduct(data);
                                setShowScanner(false);
                            }}
                            onClose={() => setShowScanner(false)}
                            apiEndpoint="/api/beauty"
                        />
                    </div>
                )
            }

            {/* Cosmetic Product Result Modal */}
            {
                scannedBeautyProduct && (
                    <div className="fixed inset-0 z-[101] overflow-y-auto overflow-x-hidden">
                        <div
                            className="fixed inset-0 bg-black/80 backdrop-blur-xl animate-fade-in"
                            onClick={() => setScannedBeautyProduct(null)}
                        />

                        <div className="min-h-full flex items-center justify-center p-4 pt-20 sm:pt-4 pointer-events-none">
                            <div className="relative w-full max-w-md bg-[#181824] border border-white/10 shadow-2xl rounded-3xl overflow-hidden animate-scale-up pointer-events-auto">

                                {/* Header Image */}
                                <div className="relative h-48 bg-gradient-to-b from-gray-800 to-[#181824] flex items-center justify-center overflow-hidden">
                                    {scannedBeautyProduct.image_url ? (
                                        <>
                                            <div
                                                className="absolute inset-0 bg-cover bg-center opacity-30 blur-md"
                                                style={{ backgroundImage: `url(${scannedBeautyProduct.image_url})` }}
                                            />
                                            <img
                                                src={scannedBeautyProduct.image_url}
                                                alt={scannedBeautyProduct.name}
                                                className="relative z-10 h-full w-auto object-contain p-4 drop-shadow-2xl"
                                            />
                                        </>
                                    ) : (
                                        <SprayCan className="w-16 h-16 text-gray-600" />
                                    )}
                                    <button
                                        onClick={() => setScannedBeautyProduct(null)}
                                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors z-20"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-6">
                                    <div className="text-center mb-6">
                                        <h3 className="text-2xl font-bold text-white mb-1 leading-tight">{scannedBeautyProduct.name}</h3>
                                        {scannedBeautyProduct.brand && (
                                            <p className="text-purple-400 font-medium">{scannedBeautyProduct.brand}</p>
                                        )}
                                    </div>

                                    {/* Analysis Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center ${scannedBeautyProduct.additives_count === 0 ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                            scannedBeautyProduct.additives_count < 3 ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                                scannedBeautyProduct.additives_count < 6 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/10 border-red-500/20 text-red-400'
                                            }`}>
                                            <span className="text-3xl font-black mb-1">{scannedBeautyProduct.additives_count}</span>
                                            <span className="text-xs uppercase font-bold tracking-wider">Additives</span>
                                        </div>

                                        <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center ${scannedBeautyProduct.has_palm_oil ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                            'bg-green-500/10 border-green-500/20 text-green-400'
                                            }`}>
                                            {scannedBeautyProduct.has_palm_oil ? (
                                                <>
                                                    <AlertTriangle className="w-8 h-8 mb-1" />
                                                    <span className="text-xs uppercase font-bold tracking-wider">Palm Oil</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-8 h-8 mb-1" />
                                                    <span className="text-xs uppercase font-bold tracking-wider">No Palm Oil</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ingredients */}
                                    {scannedBeautyProduct.ingredients_text ? (
                                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                            <h4 className="text-xs uppercase text-gray-500 font-bold mb-2 flex items-center gap-2">
                                                <List className="w-3 h-3" /> Ingredients
                                            </h4>
                                            <p className="text-xs text-gray-300 leading-relaxed font-mono">
                                                {scannedBeautyProduct.ingredients_text}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-sm text-gray-500 italic">No ingredients list available.</p>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
