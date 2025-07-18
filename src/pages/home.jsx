import { useAuth } from '../auth/authHelpers'
import { useState, useEffect, useRef } from 'react'
import { getGoals } from '../firebase/goalsService'
import { getBudgets, saveBudgets, updateBudget, deleteBudget } from '../firebase/budgetsService'
import { getTransactions } from '../firebase/transactionsService' // Import transactions service
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

export default function Home() {
    const {currentUser} = useAuth();
    const [goals, setGoals] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [spendingData, setSpendingData] = useState({}); // Add state to track spending calculations
    const [loading, setLoading] = useState(true);
    const [hoveredMonth, setHoveredMonth] = useState(null); // For net income chart hover
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);
    const [editAmount, setEditAmount] = useState('');
    const [currentBudgetStep, setCurrentBudgetStep] = useState(0);
    const [budgetFormData, setBudgetFormData] = useState({});
    const budgetInputRef = useRef(null);

    // Budget categories with emojis and colors
    const budgetCategories = [
        { id: 'food', name: 'Food & Dining', emoji: '🍽️', color: '#ef4444' },
        { id: 'transportation', name: 'Transportation', emoji: '🚗', color: '#f97316' },
        { id: 'shopping', name: 'Shopping', emoji: '🛍️', color: '#eab308' },
        { id: 'entertainment', name: 'Entertainment', emoji: '🎬', color: '#22c55e' },
        { id: 'bills', name: 'Bills & Utilities', emoji: '💡', color: '#06b6d4' },
        { id: 'health', name: 'Health & Fitness', emoji: '💊', color: '#3b82f6' },
        { id: 'travel', name: 'Travel', emoji: '✈️', color: '#8b5cf6' },
        { id: 'education', name: 'Education', emoji: '📚', color: '#ec4899' },
        { id: 'savings', name: 'Savings', emoji: '💰', color: '#10b981' },
        { id: 'other', name: 'Other', emoji: '📋', color: '#6b7280' }
    ];

    // Get current month's start and end dates
    const getCurrentMonthRange = () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { startOfMonth, endOfMonth };
    };

    // Filter transactions for current month
    const getCurrentMonthTransactions = () => {
        const { startOfMonth, endOfMonth } = getCurrentMonthRange();
        
        return transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
        });
    };

    // Calculate spending by category for current month
    const calculateSpendingByCategory = () => {
        const currentMonthTransactions = getCurrentMonthTransactions();
        const spendingByCategory = {};
        
        // Initialize all categories with 0
        budgetCategories.forEach(category => {
            spendingByCategory[category.id] = 0;
        });
        
        // Sum up expenses by category
        currentMonthTransactions.forEach(transaction => {
            if (transaction.type === 'expense' && transaction.category) {
                // Try to find the budget category by matching the transaction category
                // First try exact ID match (lowercase)
                let budgetCategory = budgetCategories.find(cat => 
                    cat.id.toLowerCase() === transaction.category.toLowerCase()
                );
                
                // If no ID match, try matching by display name
                if (!budgetCategory) {
                    budgetCategory = budgetCategories.find(cat => 
                        cat.name.toLowerCase() === transaction.category.toLowerCase()
                    );
                }
                
                const categoryId = budgetCategory ? budgetCategory.id : 'other';
                spendingByCategory[categoryId] += Math.abs(transaction.amount);
            }
        });
        
        return spendingByCategory;
    };

    // Get budgets with real spending data
    const getBudgetsWithSpending = () => {
        return budgets.map(budget => {
            const spentAmount = spendingData[budget.id] || 0;
            return {
                ...budget,
                spentAmount: spentAmount
            };
        });
    };

    const fetchGoals = async () => {
        try {
            if (!currentUser?.uid) return;
            const fetchedGoals = await getGoals(currentUser.uid);
            console.log('Fetched goals:', fetchedGoals);
            setGoals(fetchedGoals);
        } catch (error) {
            console.error('Error fetching goals:', error);
        }
    };

    const fetchBudgets = async () => {
        try {
            if (!currentUser?.uid) return;
            const fetchedBudgets = await getBudgets(currentUser.uid);
            console.log('Fetched budgets:', fetchedBudgets);
            setBudgets(fetchedBudgets);
        } catch (error) {
            console.error('Error fetching budgets:', error);
        }
    };

    const fetchTransactions = async () => {
        try {
            if (!currentUser?.uid) return;
            const fetchedTransactions = await getTransactions(currentUser.uid);
            console.log('Fetched transactions:', fetchedTransactions);
            setTransactions(fetchedTransactions);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get upcoming goals (due within 30 days, including overdue)
    const getUpcomingGoals = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
        const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
        
        return goals
            .filter(goal => {
                if (!goal.dueDate) return false;
                const dueDate = new Date(goal.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate >= sevenDaysAgo && dueDate <= thirtyDaysFromNow;
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 6);
    };

    // Get days until due
    const getDaysUntil = (dueDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'tomorrow';
        if (diffDays < 7) return `in ${diffDays} days`;
        return `${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    };

    // Get progress percentage
    const getProgress = (current, target) => {
        if (!target || target === 0) return 0;
        return Math.round((current / target) * 100);
    };

    // Get priority icon
    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'high': return '🔥';
            case 'medium': return '⚡';
            case 'low': return '🌱';
            default: return '📋';
        }
    };

    // Budget modal handlers
    const handleCreateBudget = () => {
        setShowBudgetModal(true);
        setCurrentBudgetStep(0);
        setBudgetFormData({});
    };

    const handleBudgetStepNext = async () => {
        if (currentBudgetStep < budgetCategories.length - 1) {
            setCurrentBudgetStep(prev => prev + 1);
        } else {
            try {
                // Create budgets array from form data
                const newBudgets = budgetCategories
                    .filter(category => budgetFormData[category.id] && budgetFormData[category.id] > 0)
                    .map(category => ({
                        id: category.id,
                        name: category.name,
                        emoji: category.emoji,
                        color: category.color,
                        budgetAmount: budgetFormData[category.id]
                    }));
                
                // Save to Firebase
                if (newBudgets.length > 0) {
                    await saveBudgets(currentUser.uid, newBudgets);
                    console.log('Budgets saved successfully');
                    
                    // Refresh budgets from Firebase
                    await fetchBudgets();
                }
                
                // Close modal and reset
                setShowBudgetModal(false);
                setCurrentBudgetStep(0);
                setBudgetFormData({});
            } catch (error) {
                console.error('Error saving budgets:', error);
            }
        }
    };

    const handleBudgetStepPrevious = () => {
        if (currentBudgetStep > 0) {
            setCurrentBudgetStep(prev => prev - 1);
        }
    };

    const handleBudgetAmountChange = (categoryId, amount) => {
        setBudgetFormData(prev => ({
            ...prev,
            [categoryId]: parseFloat(amount) || 0
        }));
    };

    const closeBudgetModal = () => {
        setShowBudgetModal(false);
        setCurrentBudgetStep(0);
        setBudgetFormData({});
    };

    // Edit budget handlers
    const handleEditBudget = (budget) => {
        setEditingBudget(budget);
        setEditAmount(budget.budgetAmount.toString());
        setShowEditModal(true);
    };

    // Handle adding budget to unused category
    const handleAddBudget = (category) => {
        const budgetToAdd = {
            id: category.id,
            name: category.name,
            emoji: category.emoji,
            color: category.color,
            budgetAmount: 0
        };
        
        setEditingBudget(budgetToAdd);
        setEditAmount('');
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingBudget) return;
        
        try {
            const updatedAmount = parseFloat(editAmount) || 0;
            
            if (updatedAmount <= 0) {
                closeEditModal();
                return;
            }
            
            const existingBudget = budgets.find(b => b.id === editingBudget.id);
            
            if (existingBudget) {
                await updateBudget(currentUser.uid, editingBudget.id, {
                    budgetAmount: updatedAmount
                });
            } else {
                const newBudget = {
                    ...editingBudget,
                    budgetAmount: updatedAmount
                };
                await saveBudgets(currentUser.uid, [newBudget]);
            }
            
            console.log('Budget saved successfully');
            await fetchBudgets();
            closeEditModal();
        } catch (error) {
            console.error('Error saving budget:', error);
        }
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingBudget(null);
        setEditAmount('');
    };

    // Delete budget handler
    const handleDeleteBudget = async (budgetId) => {
        try {
            await deleteBudget(currentUser.uid, budgetId);
            console.log('Budget deleted successfully');
            await fetchBudgets();
        } catch (error) {
            console.error('Error deleting budget:', error);
        }
    };

    // Calculate budget progress
    const getBudgetProgress = (spent, budget) => {
        if (!budget || budget === 0) return 0;
        return Math.round((spent / budget) * 100);
    };

    // Get budget status color
    const getBudgetStatusColor = (progress) => {
        if (progress >= 100) return '#ef4444'; // Red - exceeding budget
        if (progress >= 50) return '#f59e0b'; // Orange - second half
        return '#10b981'; // Green - first half
    };

    // Get category color by ID
    const getCategoryColor = (categoryId) => {
        const category = budgetCategories.find(cat => cat.id === categoryId);
        return category ? category.color : '#6b7280';
    };

    // Prepare pie chart data with real spending
    const preparePieChartData = (budgetsWithSpending) => {
        const totalBudget = budgetsWithSpending.reduce((sum, budget) => sum + budget.budgetAmount, 0);
        const totalSpent = budgetsWithSpending.reduce((sum, budget) => sum + budget.spentAmount, 0);
        const remainingBudget = totalBudget - totalSpent;
        
        const spentData = budgetsWithSpending
            .filter(budget => budget.spentAmount > 0) // Only show categories with spending
            .map(budget => ({
                name: budget.name,
                value: budget.spentAmount,
                color: budget.color,
                emoji: budget.emoji,
                type: 'spent'
            }));
        
        // Add unused portion if there's remaining budget
        if (remainingBudget > 0) {
            spentData.push({
                name: 'Remaining Budget',
                value: remainingBudget,
                color: '#e5e7eb',
                emoji: '💵',
                type: 'remaining'
            });
        }
        
        return spentData;
    };

    // Custom tooltip for pie chart
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            return (
                <div className="pie-chart-tooltip">
                    <div className="tooltip-content">
                        <span className="tooltip-emoji">{data.payload.emoji}</span>
                        <span className="tooltip-name">{data.payload.name}</span>
                        <span className="tooltip-amount">${data.value.toLocaleString()}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Get current month name for display
    const getCurrentMonthName = () => {
        const now = new Date();
        return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Calculate net income by month for the current year
    const calculateNetIncomeByMonth = () => {
        const currentYear = new Date().getFullYear();
        const monthlyData = [];
        
        // Initialize data for all 12 months
        for (let month = 0; month < 12; month++) {
            const monthName = new Date(currentYear, month, 1).toLocaleDateString('en-US', { month: 'short' });
            monthlyData.push({
                month: monthName,
                monthNumber: month,
                income: 0,
                expenses: 0,
                netIncome: 0
            });
        }
        
        // Calculate income and expenses for each month
        transactions.forEach(transaction => {
            const transactionDate = new Date(transaction.date);
            if (transactionDate.getFullYear() === currentYear) {
                const monthIndex = transactionDate.getMonth();
                const amount = Math.abs(transaction.amount);
                
                if (transaction.type === 'income') {
                    monthlyData[monthIndex].income += amount;
                } else if (transaction.type === 'expense') {
                    monthlyData[monthIndex].expenses += amount;
                }
            }
        });
        
        // Calculate net income for each month
        monthlyData.forEach(data => {
            data.netIncome = data.income - data.expenses;
        });
        
        return monthlyData;
    };

    // Calculate year-to-date net income
    const calculateYearToDateNetIncome = () => {
        const currentYear = new Date().getFullYear();
        let totalIncome = 0;
        let totalExpenses = 0;
        
        transactions.forEach(transaction => {
            const transactionDate = new Date(transaction.date);
            if (transactionDate.getFullYear() === currentYear) {
                const amount = Math.abs(transaction.amount);
                
                if (transaction.type === 'income') {
                    totalIncome += amount;
                } else if (transaction.type === 'expense') {
                    totalExpenses += amount;
                }
            }
        });
        
        return totalIncome - totalExpenses;
    };

    // Get display text for net income summary
    const getNetIncomeDisplayText = () => {
        const currentYear = new Date().getFullYear();
        const currentDate = new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
        });
        
        if (hoveredMonth !== null) {
            const monthlyData = calculateNetIncomeByMonth();
            const monthData = monthlyData[hoveredMonth];
            const monthName = new Date(currentYear, hoveredMonth, 1).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            });
            
            return {
                timeRange: monthName,
                amount: monthData.netIncome
            };
        }
        
        return {
            timeRange: `January 1, ${currentYear} - ${currentDate}`,
            amount: calculateYearToDateNetIncome()
        };
    };

    // Custom bar chart handlers
    const handleBarMouseEnter = (data, index) => {
        setHoveredMonth(data.monthNumber);
    };

    const handleBarMouseLeave = () => {
        setHoveredMonth(null);
    };

    // Calculate the maximum net income for Y-axis
    const getMaxNetIncome = (data) => {
        if (!data || data.length === 0) return 1000;
        const maxValue = Math.max(...data.map(item => item.netIncome));
        // Round up to nearest thousand
        return Math.ceil(maxValue / 1000) * 1000;
    };

    // Recalculate spending when transactions change
    useEffect(() => {
        if (transactions.length > 0) {
            const newSpendingData = calculateSpendingByCategory();
            setSpendingData(newSpendingData);
        } else {
            // Reset spending data when no transactions
            const emptySpending = {};
            budgetCategories.forEach(category => {
                emptySpending[category.id] = 0;
            });
            setSpendingData(emptySpending);
        }
    }, [transactions]);

    // Function to refresh all data (can be called from parent component)
    const refreshData = async () => {
        if (currentUser?.uid) {
            setLoading(true);
            await Promise.all([
                fetchGoals(),
                fetchBudgets(),
                fetchTransactions()
            ]);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            setLoading(true);
            fetchGoals();
            fetchBudgets();
            fetchTransactions(); // Fetch transactions
        } else {
            setLoading(false);
        }
    }, [currentUser]);

    // Auto-focus budget input when step changes or modal opens
    useEffect(() => {
        if (showBudgetModal && budgetInputRef.current) {
            setTimeout(() => {
                budgetInputRef.current?.focus();
            }, 100);
        }
    }, [currentBudgetStep, showBudgetModal]);

    if (!currentUser) {
        return (
            <div>
                <h1>Please log in to view your goals</h1>
            </div>
        );
    }

    const upcomingGoals = getUpcomingGoals();
    const currentCategory = budgetCategories[currentBudgetStep];
    const budgetsWithSpending = getBudgetsWithSpending();
    const pieChartData = preparePieChartData(budgetsWithSpending);
    const netIncomeData = calculateNetIncomeByMonth();
    const netIncomeDisplay = getNetIncomeDisplayText();
    const maxNetIncome = getMaxNetIncome(netIncomeData);

    // Custom Y-axis tick component to only show top value
    const CustomYAxisTick = (props) => {
        const { x, y, payload } = props;
        if (payload.value === maxNetIncome) {
            return (
                <g transform={`translate(${x},${y})`}>
                    <text 
                        x={0} 
                        y={0} 
                        dy={4} 
                        textAnchor="end" 
                        fill="#6b7280" 
                        fontSize={12}
                    >
                        ${payload.value.toLocaleString()}
                    </text>
                </g>
            );
        }
        return null;
    };

    return (
        <div className="home-dashboard">
            <div className="welcome-section">
                <h1>Welcome back, {currentUser.displayName}!</h1>
                <p>Here's what's coming up for your goals and budgets</p>
            </div>

            {/* Upcoming Goals Section - Always at the top */}
            <div className="upcoming-section">
                <h2 className="section-title">Upcoming Goals</h2>
                {upcomingGoals.length > 0 ? (
                    <div className="upcoming-goals-container">
                        {upcomingGoals.map((goal) => {
                            const progress = getProgress(goal.currentAmount, goal.targetAmount);
                            const daysUntil = getDaysUntil(goal.dueDate);
                            
                            return (
                                <div key={goal.id} className="upcoming-goal-card">
                                    <div className="goal-timeline">
                                        <span className="goal-due-date">{daysUntil}</span>
                                        <div className="goal-priority">
                                            {getPriorityIcon(goal.priority)}
                                        </div>
                                    </div>
                                    
                                    <div className="goal-content">
                                        <h3 className="goal-title">{goal.title}</h3>
                                        <div className="goal-amount">
                                            ${goal.currentAmount?.toLocaleString() || 0}
                                        </div>
                                        <div className="goal-progress-bar">
                                            <div 
                                                className="goal-progress-fill" 
                                                style={{ 
                                                    width: `${Math.min(progress, 100)}%`,
                                                    backgroundColor: progress >= 80 ? '#10b981' : 
                                                                   progress >= 60 ? '#f59e0b' : 
                                                                   progress >= 40 ? '#f97316' : '#ef4444'
                                                }}
                                            ></div>
                                        </div>
                                        <span className="goal-progress-text">{progress}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="no-upcoming">
                        <h2>No upcoming goals</h2>
                        <p>You're all caught up! Consider setting some new goals to track your progress.</p>
                    </div>
                )}
            </div>

            {/* Net Income Section */}
            <div className="net-income-section">
                <div className="net-income-header">
                    <div className="net-income-info">
                        <h2 className="net-income-title">Net Income</h2>
                        <div className="net-income-summary">
                            <div className="net-income-amount" style={{ 
                                color: netIncomeDisplay.amount >= 0 ? '#10b981' : '#ef4444' 
                            }}>
                                ${netIncomeDisplay.amount.toLocaleString()}
                            </div>
                            <div className="net-income-period">{netIncomeDisplay.timeRange}</div>
                        </div>
                    </div>
                </div>
                
                <div className="net-income-chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={netIncomeData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            onMouseLeave={handleBarMouseLeave}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                                dataKey="month" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                            />
                            <YAxis 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                tickFormatter={(value) => `${value.toLocaleString()}`}
                            />
                            <Bar 
                                dataKey="netIncome" 
                                radius={[4, 4, 0, 0]}
                                onMouseEnter={handleBarMouseEnter}
                                fill={(entry) => entry >= 0 ? '#10b981' : '#ef4444'}
                            >
                                {netIncomeData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.netIncome >= 0 ? '#10b981' : '#ef4444'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Budget Section */}
            <div className="budget-section">
                <h2 className="section-title">Monthly Budget - {getCurrentMonthName()}</h2>
                {loading ? (
                    <div className="create-budget-card">
                        <div className="create-budget-content">
                            <div className="create-budget-icon">⏳</div>
                            <div className="create-budget-text">Loading your budget...</div>
                        </div>
                    </div>
                ) : budgets.length === 0 ? (
                    <div className="create-budget-card" onClick={handleCreateBudget}>
                        <div className="create-budget-content">
                            <div className="create-budget-icon">💰</div>
                            <div className="create-budget-text">Create Your Monthly Budget</div>
                            <div className="create-budget-subtitle">Set spending limits for different categories</div>
                        </div>
                    </div>
                ) : (
                    <div className="budget-dashboard-container">
                        <div className="budget-list">
                            {budgetCategories
                                .sort((a, b) => {
                                    const budgetA = budgetsWithSpending.find(budget => budget.id === a.id);
                                    const budgetB = budgetsWithSpending.find(budget => budget.id === b.id);
                                    const isUsedA = !!budgetA;
                                    const isUsedB = !!budgetB;
                                    
                                    if (isUsedA && !isUsedB) return -1;
                                    if (!isUsedA && isUsedB) return 1;
                                    return 0;
                                })
                                .map((category, index) => {
                                const budget = budgetsWithSpending.find(b => b.id === category.id);
                                const isUsed = !!budget;
                                const progress = isUsed ? getBudgetProgress(budget.spentAmount, budget.budgetAmount) : 0;
                                const statusColor = isUsed ? getBudgetStatusColor(progress) : '#e5e7eb';
                                
                                return (
                                    <div 
                                        key={category.id} 
                                        className={`budget-item ${!isUsed ? 'budget-item-unused' : ''}`} 
                                        style={{ '--item-index': index }}
                                        onClick={!isUsed ? () => handleAddBudget(category) : undefined}
                                    >
                                        {!isUsed && <div className="budget-item-add-icon">➕</div>}
                                        <div className="budget-item-content">
                                            <div className="budget-item-left">
                                                <span 
                                                    className="budget-item-emoji"
                                                    style={{
                                                        background: isUsed 
                                                            ? `linear-gradient(135deg, ${category.color}20 0%, ${category.color}15 100%)`
                                                            : undefined,
                                                        border: isUsed ? `1px solid ${category.color}30` : undefined
                                                    }}
                                                >
                                                    {category.emoji}
                                                </span>
                                                <div className="budget-item-name-container">
                                                    <span className="budget-item-name">{category.name}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="budget-item-center">
                                                {isUsed ? (
                                                    <>
                                                        <span className="budget-amount-current">${budget.spentAmount.toLocaleString()}</span>
                                                        <div className="budget-item-progress-bar">
                                                            <div 
                                                                className="budget-item-progress-fill" 
                                                                style={{ 
                                                                    width: `${Math.min(progress, 100)}%`,
                                                                    backgroundColor: statusColor
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <span className="budget-amount-max">${budget.budgetAmount.toLocaleString()}</span>
                                                    </>
                                                ) : (
                                                    <div style={{ flex: 1 }}></div>
                                                )}
                                            </div>
                                            
                                            <div className="budget-item-right">
                                                {isUsed ? (
                                                    <>
                                                        <span className="budget-item-percentage" style={{ color: statusColor }}>
                                                            {`${progress}%`}
                                                        </span>
                                                        <div className="budget-item-actions">
                                                            <button 
                                                                className="budget-action-btn edit"
                                                                onClick={() => handleEditBudget(budget)}
                                                                title="Edit budget"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button 
                                                                className="budget-action-btn delete"
                                                                onClick={() => handleDeleteBudget(budget.id)}
                                                                title="Delete budget"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="budget-item-percentage" style={{ color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                                                        Unused
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="budget-pie-chart-container">
                            <h3 className="pie-chart-title">Budget Usage Overview</h3>
                            <div className="pie-chart-wrapper">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={120}
                                            paddingAngle={0}
                                            dataKey="value"
                                            animationBegin={600}
                                            animationDuration={1000}
                                        >
                                            {pieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="budget-summary">
                                <div className="budget-summary-item">
                                    <span className="summary-label">Total Spent:</span>
                                    <span className="summary-amount spent">${budgetsWithSpending.reduce((sum, budget) => sum + budget.spentAmount, 0).toLocaleString()}</span>
                                </div>
                                <div className="budget-summary-item">
                                    <span className="summary-label">Total Budget:</span>
                                    <span className="summary-amount budget">${budgetsWithSpending.reduce((sum, budget) => sum + budget.budgetAmount, 0).toLocaleString()}</span>
                                </div>
                                <div className="budget-summary-item">
                                    <span className="summary-label">Remaining:</span>
                                    <span className="summary-amount remaining">${(budgetsWithSpending.reduce((sum, budget) => sum + budget.budgetAmount, 0) - budgetsWithSpending.reduce((sum, budget) => sum + budget.spentAmount, 0)).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Budget Creation Modal */}
            {showBudgetModal && (
                <div className="modal-overlay">
                    <div className="modal-content budget-modal">
                        <div className="modal-header">
                            <h2>Set Monthly Budget</h2>
                            <button className="modal-close" onClick={closeBudgetModal}>×</button>
                        </div>
                        
                        <div className="modal-body budget-modal-body">
                            <div className="budget-step-indicator">
                                <div className="step-text">
                                    Step {currentBudgetStep + 1} of {budgetCategories.length}
                                </div>
                                <div className="step-progress-bar">
                                    <div 
                                        className="step-progress-fill" 
                                        style={{ 
                                            width: `${((currentBudgetStep + 1) / budgetCategories.length) * 100}%` 
                                        }}
                                    ></div>
                                </div>
                            </div>
                            
                            <div className="budget-category-setup">
                                <div className="budget-category-emoji">{currentCategory.emoji}</div>
                                <h3 className="budget-category-title">{currentCategory.name}</h3>
                                <p className="budget-category-description">
                                    How much do you want to budget for {currentCategory.name.toLowerCase()} this month?
                                </p>
                                
                                <div className="budget-input-container">
                                    <span className="budget-currency">$</span>
                                    <input
                                        ref={budgetInputRef}
                                        type="number"
                                        className="budget-amount-input"
                                        placeholder="0"
                                        value={budgetFormData[currentCategory.id] || ''}
                                        onChange={(e) => handleBudgetAmountChange(currentCategory.id, e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                
                                <div className="budget-skip-note">
                                    Leave blank or enter $0 to skip this category
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                className="modal-cancel-btn" 
                                onClick={handleBudgetStepPrevious}
                                disabled={currentBudgetStep === 0}
                            >
                                Previous
                            </button>
                            <button 
                                className="modal-save-btn" 
                                onClick={handleBudgetStepNext}
                            >
                                {currentBudgetStep === budgetCategories.length - 1 ? 'Finish' : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Budget Modal */}
            {showEditModal && editingBudget && (
                <div className="modal-overlay">
                    <div className="modal-content edit-budget-modal">
                        <div className="modal-header">
                            <h2>{budgetsWithSpending.find(b => b.id === editingBudget?.id) ? 'Edit Budget' : 'Add Budget'}</h2>
                            <button className="modal-close" onClick={closeEditModal}>×</button>
                        </div>
                        
                        <div className="modal-body edit-budget-modal-body">
                            <div className="edit-budget-category">
                                <div className="edit-budget-emoji">{editingBudget.emoji}</div>
                                <h3 className="edit-budget-title">{editingBudget.name}</h3>
                                <p className="edit-budget-description">
                                    {budgetsWithSpending.find(b => b.id === editingBudget?.id) 
                                        ? `Update your monthly budget for ${editingBudget.name.toLowerCase()}`
                                        : `Set your monthly budget for ${editingBudget.name.toLowerCase()}`
                                    }
                                </p>
                                
                                <div className="edit-budget-input-container">
                                    <span className="edit-budget-currency">$</span>
                                    <input
                                        type="number"
                                        className="edit-budget-amount-input"
                                        placeholder="0"
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                className="modal-cancel-btn" 
                                onClick={closeEditModal}
                            >
                                Cancel
                            </button>
                            <button 
                                className="modal-save-btn" 
                                onClick={handleSaveEdit}
                            >
                                {budgets.find(b => b.id === editingBudget?.id) ? 'Save Changes' : 'Add Budget'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
