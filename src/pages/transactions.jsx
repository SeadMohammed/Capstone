import { useEffect, useState } from "react";
import { getTransactions, addTransaction, deleteTransaction, updateTransaction } from "../firebase/transactionsService";
import { auth } from "../auth/firebaseConfig";

export default function Transactions() {
  // Page elements
  const [transactions, setTransactions] = useState([]);
  const [newTransaction, setNewTransaction] = useState({
    description: "",
    amount: "",
    type: "expense",
    category: "",
    date: new Date().toISOString().split('T')[0]
  });

  // Month selection for bank statement view
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // Editing
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState({
    description: "",
    amount: "",
    type: "expense",
    category: "",
    date: ""
  });

  // Modal and filters
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Categories
  const categories = [
    "Food & Dining", "Transportation", "Shopping", "Entertainment", 
    "Bills & Utilities", "Healthcare", "Education", "Travel", 
    "Investment", "Salary", "Freelance", "Other"
  ];

  // Generate month options for the last 12 months and next 3 months
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    
    // Add last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      const shortLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      options.push({ value, label, shortLabel });
    }
    
    // Add next 3 months
    for (let i = 1; i <= 3; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      const shortLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      options.push({ value, label, shortLabel });
    }
    
    return options;
  };

  // Filter transactions by selected month
  const getTransactionsForMonth = () => {
    return transactions.filter(transaction => {
      const transactionMonth = transaction.date.substring(0, 7); // Get YYYY-MM format
      const matchesMonth = transactionMonth === selectedMonth;
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesMonth && matchesSearch;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
  };

  // Calculate running balance for the month
  const calculateRunningBalance = (monthTransactions) => {
    // Get previous month's ending balance
    const previousMonth = new Date(selectedMonth + "-01");
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const prevMonthString = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
    
    const previousTransactions = transactions.filter(t => t.date.substring(0, 7) <= prevMonthString);
    const startingBalance = previousTransactions.reduce((sum, t) => {
      return sum + (t.type === "income" ? t.amount : -t.amount);
    }, 0);

    // Calculate running balance for each transaction in the month
    let runningBalance = startingBalance;
    return monthTransactions.map(transaction => {
      runningBalance += transaction.type === "income" ? transaction.amount : -transaction.amount;
      return {
        ...transaction,
        runningBalance
      };
    });
  };

  // Fetch all transactions
  const fetchTransactions = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const data = await getTransactions(user.uid);
    setTransactions(data);
  };

  // Handler for adding a new transaction
  const handleAdd = async () => {
    const user = auth.currentUser;
    if (!user || !newTransaction.description || !newTransaction.amount) return;
    
    await addTransaction(
      user.uid, 
      newTransaction.description, 
      newTransaction.amount, 
      newTransaction.type, 
      newTransaction.category, 
      newTransaction.date
    );
    
    setNewTransaction({
      description: "",
      amount: "",
      type: "expense",
      category: "",
      date: new Date().toISOString().split('T')[0]
    });
    setShowAddModal(false);
    fetchTransactions();
  };

  // Handler for deleting a transaction
  const handleDelete = async (transactionId) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteTransaction(user.uid, transactionId);
    fetchTransactions();
  };

  // Handler for starting to edit a transaction
  const handleEdit = (transaction) => {
    setEditingTransactionId(transaction.id);
    setEditingTransaction({
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      date: transaction.date
    });
  };

  // Handler for canceling edit
  const handleCancel = () => {
    setEditingTransactionId(null);
    setEditingTransaction({
      description: "",
      amount: "",
      type: "expense",
      category: "",
      date: ""
    });
  };

  // Save edited transaction
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !editingTransaction.description || !editingTransaction.amount) return;
    
    await updateTransaction(user.uid, editingTransactionId, {
      description: editingTransaction.description,
      amount: parseFloat(editingTransaction.amount),
      type: editingTransaction.type,
      category: editingTransaction.category,
      date: editingTransaction.date,
    });
    
    setEditingTransactionId(null);
    setEditingTransaction({
      description: "",
      amount: "",
      type: "expense",
      category: "",
      date: ""
    });
    fetchTransactions();
  };

  // Get filtered transactions for the month
  const monthTransactions = getTransactionsForMonth();
  const transactionsWithBalance = calculateRunningBalance(monthTransactions);

  // Calculate ALL-TIME totals for summary cards
  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  // Calculate monthly totals for the selected month
  const monthlyIncome = monthTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyExpenses = monthTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get current month name for display
  const getCurrentMonthName = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="transactions-layout">
      {/* Main Content */}
      <div className="main-content">
        <div className="bank-statement-container">
          {/* Header */}
          <div className="statement-header">
            <div className="statement-title">
              <h1>Transaction Statement</h1>
              <p className="company-name">Personal Finance Tracker</p>
            </div>
            <div className="statement-date">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="statement-controls">
            <div className="search-control">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions..."
                className="search-input"
              />
            </div>

            <button className="add-transaction-btn" onClick={() => setShowAddModal(true)}>
              + Add Transaction
            </button>
          </div>

          {/* Current Month Display */}
          <div className="current-period">
            <h2>{getCurrentMonthName()}</h2>
            <div className="period-badge">Statement Period</div>
          </div>

          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card income">
              <div className="summary-label">Total Income</div>
              <div className="summary-amount income-amount">{formatCurrency(totalIncome)}</div>
            </div>
            <div className="summary-card expense">
              <div className="summary-label">Total Expenses</div>
              <div className="summary-amount expense-amount">{formatCurrency(totalExpenses)}</div>
            </div>
            <div className="summary-card balance">
              <div className="summary-label">Net Balance</div>
              <div className={`summary-amount ${netBalance >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(netBalance)}
              </div>
            </div>
          </div>

          {/* Bank Statement Table */}
          <div className="statement-table-container">
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction Description</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactionsWithBalance.map((transaction, index) => (
                  <tr key={transaction.id} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                    {editingTransactionId === transaction.id ? (
                      <>
                        <td>
                          <input
                            type="date"
                            value={editingTransaction.date}
                            onChange={(e) => setEditingTransaction({...editingTransaction, date: e.target.value})}
                            className="edit-input-sm"
                          />
                        </td>
                        <td>
                          <input
                            value={editingTransaction.description}
                            onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})}
                            className="edit-input"
                            placeholder="Description"
                          />
                          <select
                            value={editingTransaction.category}
                            onChange={(e) => setEditingTransaction({...editingTransaction, category: e.target.value})}
                            className="edit-select-sm"
                          >
                            <option value="">Category</option>
                            {categories.map(category => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </td>
                        <td colSpan="2">
                          <div className="edit-amount-section">
                            <select
                              value={editingTransaction.type}
                              onChange={(e) => setEditingTransaction({...editingTransaction, type: e.target.value})}
                              className="edit-select-sm"
                            >
                              <option value="income">Credit</option>
                              <option value="expense">Debit</option>
                            </select>
                            <input
                              type="number"
                              value={editingTransaction.amount}
                              onChange={(e) => setEditingTransaction({...editingTransaction, amount: e.target.value})}
                              className="edit-input-sm"
                              placeholder="Amount"
                              step="0.01"
                            />
                          </div>
                        </td>
                        <td>-</td>
                        <td>
                          <div className="edit-actions">
                            <button onClick={handleSave} className="save-btn-sm">✓</button>
                            <button onClick={handleCancel} className="cancel-btn-sm">✕</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="date-cell">{formatDate(transaction.date)}</td>
                        <td className="description-cell">
                          <div className="description-main">{transaction.description}</div>
                          {transaction.category && (
                            <div className="description-category">{transaction.category}</div>
                          )}
                        </td>
                        <td className="debit-cell">
                          {transaction.type === "expense" ? formatCurrency(transaction.amount) : ""}
                        </td>
                        <td className="credit-cell">
                          {transaction.type === "income" ? formatCurrency(transaction.amount) : ""}
                        </td>
                        <td className="balance-cell">
                          <span className={transaction.runningBalance >= 0 ? 'positive-balance' : 'negative-balance'}>
                            {formatCurrency(transaction.runningBalance)}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <button onClick={() => handleEdit(transaction)} className="edit-btn-sm">✏️</button>
                          <button onClick={() => handleDelete(transaction.id)} className="delete-btn-sm">🗑️</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty state */}
            {transactionsWithBalance.length === 0 && (
              <div className="empty-statement">
                <p>No transaction was added</p>
                <button onClick={() => setShowAddModal(true)} className="add-first-transaction">
                  Add your first transaction
                </button>
              </div>
            )}
          </div>

          {/* Monthly Income Summary */}
          {transactionsWithBalance.length > 0 && (
            <div className="account-balance-summary">
              <div className="balance-info">
                <span>Monthly Income:</span>
                <span className={`current-balance ${(monthlyIncome - monthlyExpenses) >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(monthlyIncome - monthlyExpenses)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Month Selector Sidebar */}
      <div className="month-selector-sidebar">
        <h3>Select Month</h3>
        <div className="month-boxes">
          {getMonthOptions().map(option => (
            <div 
              key={option.value} 
              className={`month-box ${selectedMonth === option.value ? 'active' : ''}`}
              onClick={() => setSelectedMonth(option.value)}
            >
              <div className="month-box-month">{option.shortLabel.split(' ')[0]}</div>
              <div className="month-box-year">{option.shortLabel.split(' ')[1]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Transaction</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <input
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                placeholder="Transaction description"
                className="modal-input"
              />
              <input
                type="number"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                placeholder="Amount"
                className="modal-input"
                step="0.01"
              />
              <select
                value={newTransaction.type}
                onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                className="modal-select"
              >
                <option value="expense">Expense </option>
                <option value="income">Income </option>
              </select>
              <select
                value={newTransaction.category}
                onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                className="modal-select"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <input
                type="date"
                value={newTransaction.date}
                onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                className="modal-input"
              />
            </div>
            <div className="modal-footer">
              <button onClick={handleAdd} className="modal-save-btn">Add Transaction</button>
              <button onClick={() => setShowAddModal(false)} className="modal-cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
  