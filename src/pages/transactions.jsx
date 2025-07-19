import { useEffect, useState, useRef } from 'react';
import {
  getTransactions,
  addTransaction,
  deleteTransaction,
  updateTransaction,
} from '../firebase/transactionsService';
import { auth } from '../auth/firebaseConfig';
import { fileToGenerativePart, model } from '../components/geminiBar';

export default function Transactions() {
  // Page elements
  const [transactions, setTransactions] = useState([]);
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Editing
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    date: '',
  });

  // Modal and filters
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Categories
  const categories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Education',
    'Travel',
    'Investment',
    'Salary',
    'Freelance',
    'Other',
  ];

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
      description: '',
      amount: '',
      type: 'expense',
      category: '',
      date: new Date().toISOString().split('T')[0],
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
      date: transaction.date,
    });
  };

  // Handler for canceling edit
  const handleCancel = () => {
    setEditingTransactionId(null);
    setEditingTransaction({
      description: '',
      amount: '',
      type: 'expense',
      category: '',
      date: '',
    });
  };

  // Save edited transaction
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !editingTransaction.description || !editingTransaction.amount)
      return;

    await updateTransaction(user.uid, editingTransactionId, {
      description: editingTransaction.description,
      amount: parseFloat(editingTransaction.amount),
      type: editingTransaction.type,
      category: editingTransaction.category,
      date: editingTransaction.date,
    });

    setEditingTransactionId(null);
    setEditingTransaction({
      description: '',
      amount: '',
      type: 'expense',
      category: '',
      date: '',
    });
    fetchTransactions();
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesCategory =
      filterCategory === 'all' || transaction.category === filterCategory;
    const matchesSearch = transaction.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesType && matchesCategory && matchesSearch;
  });

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fileInputRef = useRef(null);

  // Handler for when a file is selected
  const handleFileChange = async (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      const selectedFile = files[0];
      console.log('Selected file:', selectedFile.name, selectedFile.type);

      try {
        const filePart = await fileToGenerativePart(selectedFile);

        // DEFINE PROMPT HERE
        const prompt =
          'take this Bank of America statement and return it to me in a parsed json file with the following categories: date, description, amount';

        // Generate response
        const result = await model.generateContent([prompt, filePart]);
        const responseText = result.response.text();

        console.log('AI Response:', responseText);
        alert('AI Summary:\n\n' + (responseText || 'No text in response.'));
      } catch (error) {
        console.error('Error processing file with AI:', error);
        alert('Failed to process file with AI. Check console for details.');
      }
    }
  };

  // Handler for the "Upload File" button click
  const handleUploadButtonClick = () => {
    fileInputRef.current.click(); // click hidden file input
  };

  return (
    <div className='transactions-dashboard'>
      <div className='dashboard-header'>
        <h1 className='dashboard-title'>Transactions</h1>
        <button
          className='add-transaction-btn'
          onClick={() => setShowAddModal(true)}
        >
          + Add Transaction
        </button>
        <button className='upload-file-btn' onClick={handleUploadButtonClick}>
          Upload File
        </button>
        {/* Hidden file input */}
        <input
          type='file'
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }} // Hide the input visually
          accept='application/pdf' // Accepted types here
        />
      </div>

      {/* Summary Cards */}
      <div className='summary-cards'>
        <div className='summary-card income'>
          <div className='summary-label'>Total Income</div>
          <div className='summary-amount income-amount'>
            {formatCurrency(totalIncome)}
          </div>
        </div>
        <div className='summary-card expense'>
          <div className='summary-label'>Total Expenses</div>
          <div className='summary-amount expense-amount'>
            {formatCurrency(totalExpenses)}
          </div>
        </div>
        <div className='summary-card balance'>
          <div className='summary-label'>Net Balance</div>
          <div
            className={`summary-amount ${
              netBalance >= 0 ? 'positive' : 'negative'
            }`}
          >
            {formatCurrency(netBalance)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='dashboard-filters'>
        <div className='filter-group'>
          <span>Search</span>
          <input
            type='text'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder='Search transactions...'
            className='filter-input'
          />
        </div>
        <div className='filter-group'>
          <span>Type</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className='filter-select'
          >
            <option value='all'>All</option>
            <option value='income'>Income</option>
            <option value='expense'>Expense</option>
          </select>
        </div>
        <div className='filter-group'>
          <span>Category</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className='filter-select'
          >
            <option value='all'>All</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Grid */}
      <div className='transactions-grid'>
        {filteredTransactions.map((transaction) => (
          <div key={transaction.id} className='transaction-card'>
            {editingTransactionId === transaction.id ? (
              <div className='edit-form'>
                <input
                  value={editingTransaction.description}
                  onChange={(e) =>
                    setEditingTransaction({
                      ...editingTransaction,
                      description: e.target.value,
                    })
                  }
                  className='edit-input'
                  placeholder='Description'
                />
                <input
                  type='number'
                  value={editingTransaction.amount}
                  onChange={(e) =>
                    setEditingTransaction({
                      ...editingTransaction,
                      amount: e.target.value,
                    })
                  }
                  className='edit-input'
                  placeholder='Amount'
                />
                <select
                  value={editingTransaction.type}
                  onChange={(e) =>
                    setEditingTransaction({
                      ...editingTransaction,
                      type: e.target.value,
                    })
                  }
                  className='edit-select'
                >
                  <option value='income'>Income</option>
                  <option value='expense'>Expense</option>
                </select>
                <select
                  value={editingTransaction.category}
                  onChange={(e) =>
                    setEditingTransaction({
                      ...editingTransaction,
                      category: e.target.value,
                    })
                  }
                  className='edit-select'
                >
                  <option value=''>Select Category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <input
                  type='date'
                  value={editingTransaction.date}
                  onChange={(e) =>
                    setEditingTransaction({
                      ...editingTransaction,
                      date: e.target.value,
                    })
                  }
                  className='edit-input'
                />
                <div className='edit-buttons'>
                  <button onClick={handleSave} className='save-btn'>
                    Save
                  </button>
                  <button onClick={handleCancel} className='cancel-btn'>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className='transaction-header'>
                  <div className='transaction-date'>
                    {formatDate(transaction.date)}
                  </div>
                  <div className='transaction-actions'>
                    <button
                      onClick={() => handleEdit(transaction)}
                      className='edit-icon'
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className='delete-icon'
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className='transaction-description'>
                  {transaction.description}
                </div>

                <div className='transaction-category'>
                  {transaction.category}
                </div>

                <div className='transaction-amount'>
                  <span className={`amount ${transaction.type}`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </span>
                </div>

                <div className='transaction-type'>
                  <span className={`type-badge ${transaction.type}`}>
                    {transaction.type === 'income' ? '💰' : '💸'}{' '}
                    {transaction.type}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add Transaction Card */}
        <div
          className='transaction-card add-transaction-card'
          onClick={() => setShowAddModal(true)}
        >
          <div className='add-transaction-content'>
            <div className='add-transaction-icon'>+</div>
            <div className='add-transaction-text'>Add New Transaction</div>
          </div>
        </div>
      </div>

      {/* No transactions message */}
      {filteredTransactions.length === 0 && transactions.length > 0 && (
        <div className='no-results'>
          <p>No transactions match your current filters.</p>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className='modal-overlay'>
          <div className='modal-content'>
            <div className='modal-header'>
              <h2>Add New Transaction</h2>
              <button
                className='modal-close'
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <div className='modal-body'>
              <input
                value={newTransaction.description}
                onChange={(e) =>
                  setNewTransaction({
                    ...newTransaction,
                    description: e.target.value,
                  })
                }
                placeholder='Transaction description'
                className='modal-input'
              />
              <input
                type='number'
                value={newTransaction.amount}
                onChange={(e) =>
                  setNewTransaction({
                    ...newTransaction,
                    amount: e.target.value,
                  })
                }
                placeholder='Amount'
                className='modal-input'
                step='0.01'
              />
              <select
                value={newTransaction.type}
                onChange={(e) =>
                  setNewTransaction({ ...newTransaction, type: e.target.value })
                }
                className='modal-select'
              >
                <option value='expense'>Expense</option>
                <option value='income'>Income</option>
              </select>
              <select
                value={newTransaction.category}
                onChange={(e) =>
                  setNewTransaction({
                    ...newTransaction,
                    category: e.target.value,
                  })
                }
                className='modal-select'
              >
                <option value=''>Select Category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input
                type='date'
                value={newTransaction.date}
                onChange={(e) =>
                  setNewTransaction({ ...newTransaction, date: e.target.value })
                }
                className='modal-input'
              />
            </div>
            <div className='modal-footer'>
              <button onClick={handleAdd} className='modal-save-btn'>
                Add Transaction
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className='modal-cancel-btn'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
