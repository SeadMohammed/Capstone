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
    recurring: 'none',
    recurringEndDate: '',
  });

  // Month selection for bank statement view
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
  });

  // Editing
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    date: '',
    recurring: 'none',
    recurringEndDate: '',
  });

  // Modal and filters
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRecurringEditModal, setShowRecurringEditModal] = useState(false);
  const [editChoice, setEditChoice] = useState(null); // 'this-one' or 'all-series'
  const [showRecurringDeleteModal, setShowRecurringDeleteModal] =
    useState(false);
  const [deleteChoice, setDeleteChoice] = useState(null); // 'this-one' or 'all-series'
  const [deletingTransactionId, setDeletingTransactionId] = useState(null);

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

  // Generate month options from January to next January
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    const currentYear = today.getFullYear();

    // Add January through December of current year
    for (let month = 0; month < 12; month++) {
      const date = new Date(currentYear, month, 1);
      const value = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
      const shortLabel = date.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
      options.push({ value, label, shortLabel });
    }

    // Add January of next year
    const nextYearJan = new Date(currentYear + 1, 0, 1);
    const nextJanValue = `${nextYearJan.getFullYear()}-01`;
    const nextJanLabel = nextYearJan.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
    const nextJanShortLabel = nextYearJan.toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });
    options.push({
      value: nextJanValue,
      label: nextJanLabel,
      shortLabel: nextJanShortLabel,
    });

    return options;
  };

  // Filter transactions by selected month
  const getTransactionsForMonth = () => {
    return transactions
      .filter((transaction) => {
        // Handle both date formats: "07/07/2025" and "2025-07-07"
        let transactionMonth;
        if (transaction.date.includes('/')) {
          // MM/DD/YYYY format -> convert to YYYY-MM
          const [month, day, year] = transaction.date.split('/');
          transactionMonth = `${year}-${month.padStart(2, '0')}`;
        } else {
          // YYYY-MM-DD format -> extract YYYY-MM
          transactionMonth = transaction.date.substring(0, 7);
        }

        const matchesMonth = transactionMonth === selectedMonth;
        const matchesSearch = transaction.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        return matchesMonth && matchesSearch;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
  };

  // Calculate running balance for the month
  const calculateRunningBalance = (monthTransactions) => {
    // Get previous month's ending balance
    const previousMonth = new Date(selectedMonth + '-01');
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const prevMonthString = `${previousMonth.getFullYear()}-${String(
      previousMonth.getMonth() + 1
    ).padStart(2, '0')}`;

    const previousTransactions = transactions.filter(
      (t) => t.date.substring(0, 7) <= prevMonthString
    );
    const startingBalance = previousTransactions.reduce((sum, t) => {
      return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);

    // Calculate running balance for each transaction in the month
    let runningBalance = startingBalance;
    return monthTransactions.map((transaction) => {
      runningBalance +=
        transaction.type === 'income'
          ? transaction.amount
          : -transaction.amount;
      return {
        ...transaction,
        runningBalance,
      };
    });
  };

  // Remove duplicate transactions (same date, description, amount, type)
  const removeDuplicateTransactions = (transactions) => {
    const seen = new Set();
    const uniqueTransactions = [];

    for (const transaction of transactions) {
      // Create a unique key for each transaction
      const key = `${transaction.date}_${transaction.description}_${transaction.amount}_${transaction.type}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueTransactions.push(transaction);
      } else {
        console.warn(
          `Duplicate transaction detected and filtered out:`,
          transaction
        );
      }
    }

    return uniqueTransactions;
  };

  // Fetch all transactions
  const fetchTransactions = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const data = await getTransactions(user.uid);

    // Filter out any duplicates that might exist
    const uniqueData = removeDuplicateTransactions(data);

    if (data.length !== uniqueData.length) {
      console.log(
        `Filtered out ${data.length - uniqueData.length} duplicate transactions`
      );
    }

    setTransactions(uniqueData);
  };

  // Generate recurring transactions with proper date handling
  const generateRecurringTransactions = (transaction) => {
    const transactions = [];
    const startDate = new Date(transaction.date + 'T00:00:00'); // Ensure consistent date parsing
    let endDate;

    if (transaction.recurringEndDate) {
      endDate = new Date(transaction.recurringEndDate + 'T23:59:59');
    } else {
      // Default to 1 year from start date
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Generate unique series ID for this recurring set
    const recurringSeriesId = `${
      transaction.description
    }_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let currentDate = new Date(startDate);
    let iterationCount = 0;
    const maxIterations = 500;

    while (currentDate <= endDate && iterationCount < maxIterations) {
      // Format date consistently as YYYY-MM-DD
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      transactions.push({
        ...transaction,
        date: dateString,
        isRecurring: true,
        recurringSeriesId: recurringSeriesId,
        recurringParent: transaction.description,
      });

      // Calculate next occurrence with proper date handling
      switch (transaction.recurring) {
        case 'weekly':
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate = new Date(currentDate);
          // Handle month rollover properly
          const nextMonth = currentDate.getMonth() + 1;
          const nextYear =
            nextMonth > 11
              ? currentDate.getFullYear() + 1
              : currentDate.getFullYear();
          const actualNextMonth = nextMonth > 11 ? 0 : nextMonth;

          // Get the day, but handle end-of-month cases
          const targetDay = startDate.getDate();
          const daysInNextMonth = new Date(
            nextYear,
            actualNextMonth + 1,
            0
          ).getDate();
          const actualDay = Math.min(targetDay, daysInNextMonth);

          currentDate = new Date(nextYear, actualNextMonth, actualDay);
          break;
        case 'annually':
          currentDate = new Date(currentDate);
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
        default:
          return [{ ...transaction, recurringSeriesId, isRecurring: false }];
      }

      iterationCount++;
    }

    return transactions;
  };

  // Handler for adding a new transaction
  const handleAdd = async () => {
    const user = auth.currentUser;
    if (!user || !newTransaction.description || !newTransaction.amount) {
      console.error('Missing required fields:', {
        user: !!user,
        description: !!newTransaction.description,
        amount: !!newTransaction.amount,
      });
      return;
    }

    try {
      if (newTransaction.recurring !== 'none') {
        // Generate all recurring transactions
        const recurringTransactions =
          generateRecurringTransactions(newTransaction);
        console.log(
          `Adding ${recurringTransactions.length} recurring transactions`
        );

        // Add each recurring transaction
        for (const transaction of recurringTransactions) {
          await addTransaction(
            user.uid,
            transaction.description,
            parseFloat(transaction.amount), // Ensure it's a number
            transaction.type,
            transaction.category,
            transaction.date,
            transaction.recurring,
            transaction.isRecurring,
            transaction.recurringSeriesId
          );
        }
        console.log('Successfully added all recurring transactions');
      } else {
        // Add single transaction
        console.log('Adding single transaction:', newTransaction);
        await addTransaction(
          user.uid,
          newTransaction.description,
          parseFloat(newTransaction.amount), // Ensure it's a number
          newTransaction.type,
          newTransaction.category,
          newTransaction.date,
          'none',
          false,
          null // Add missing recurringSeriesId parameter
        );
        console.log('Successfully added single transaction');
      }

      setNewTransaction({
        description: '',
        amount: '',
        type: 'expense',
        category: '',
        date: new Date().toISOString().split('T')[0],
        recurring: 'none',
        recurringEndDate: '',
      });
      setShowAddModal(false);
      await fetchTransactions(); // Wait for fetch to complete
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  };

  // Handler for starting to delete a transaction
  const handleDelete = (transactionId) => {
    const transaction = transactions.find((t) => t.id === transactionId);

    // If this is a recurring transaction, ask user what they want to delete
    if (
      transaction &&
      transaction.isRecurring &&
      transaction.recurringSeriesId
    ) {
      setDeletingTransactionId(transactionId);
      setShowRecurringDeleteModal(true);
    } else {
      // Regular transaction - delete immediately
      handleDeleteConfirmed(transactionId, 'this-one');
    }
  };

  // Handle recurring delete choice
  const handleRecurringDeleteChoice = (choice) => {
    setDeleteChoice(choice);
    setShowRecurringDeleteModal(false);
    handleDeleteConfirmed(deletingTransactionId, choice);
  };

  // Actually delete the transaction(s)
  const handleDeleteConfirmed = async (transactionId, choice) => {
    const user = auth.currentUser;
    if (!user) return;

    const transaction = transactions.find((t) => t.id === transactionId);

    if (choice === 'all-series' && transaction?.recurringSeriesId) {
      // Delete all transactions in the series
      const seriesTransactions = transactions.filter(
        (t) => t.recurringSeriesId === transaction.recurringSeriesId
      );

      console.log(
        `Deleting entire recurring series: ${seriesTransactions.length} transactions`
      );

      for (const seriesTransaction of seriesTransactions) {
        await deleteTransaction(user.uid, seriesTransaction.id);
      }
    } else {
      // Delete just this one transaction
      await deleteTransaction(user.uid, transactionId);
    }

    // Reset states
    setDeletingTransactionId(null);
    setDeleteChoice(null);
    fetchTransactions();
  };

  // Handler for starting to edit a transaction
  const handleEdit = (transaction) => {
    // If this is a recurring transaction, ask user what they want to edit
    if (transaction.isRecurring && transaction.recurringSeriesId) {
      setEditingTransactionId(transaction.id);
      setEditingTransaction({
        description: transaction.description,
        amount: transaction.amount.toString(),
        type: transaction.type,
        category: transaction.category,
        date: transaction.date,
        recurring: transaction.recurring || 'none',
        recurringEndDate: transaction.recurringEndDate || '',
        recurringSeriesId: transaction.recurringSeriesId,
      });
      setShowRecurringEditModal(true);
    } else {
      // Regular transaction edit
      setEditingTransactionId(transaction.id);
      setEditingTransaction({
        description: transaction.description,
        amount: transaction.amount.toString(),
        type: transaction.type,
        category: transaction.category,
        date: transaction.date,
        recurring: transaction.recurring || 'none',
        recurringEndDate: transaction.recurringEndDate || '',
      });
    }
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
      recurring: 'none',
      recurringEndDate: '',
    });
  };

  // Handle recurring edit choice
  const handleRecurringEditChoice = (choice) => {
    setEditChoice(choice);
    setShowRecurringEditModal(false);
    // The edit form will now be visible for the user to make changes
  };

  // Save edited transaction
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !editingTransaction.description || !editingTransaction.amount)
      return;

    // Check if this is a recurring transaction edit
    if (editingTransaction.recurringSeriesId && editChoice) {
      if (editChoice === 'this-one') {
        // Edit just this one transaction - break it from the series
        await updateTransaction(user.uid, editingTransactionId, {
          description: editingTransaction.description,
          amount: parseFloat(editingTransaction.amount),
          type: editingTransaction.type,
          category: editingTransaction.category,
          date: editingTransaction.date,
          recurring: 'none',
          isRecurring: false,
          recurringSeriesId: null, // Remove from series
        });
      } else if (editChoice === 'all-series') {
        // Get all transactions in the series
        const seriesTransactions = transactions.filter(
          (t) => t.recurringSeriesId === editingTransaction.recurringSeriesId
        );

        // Get the original recurring frequency and end date for comparison
        const originalFrequency = seriesTransactions[0]?.recurring;
        const originalEndDate = seriesTransactions[0]?.recurringEndDate || '';
        const newFrequency = editingTransaction.recurring;
        const newEndDate = editingTransaction.recurringEndDate || '';

        // If frequency changed, recreate the entire series
        if (originalFrequency !== newFrequency) {
          console.log(
            `Frequency change detected: ${originalFrequency} → ${newFrequency}`
          );
          console.log(
            `Deleting ${seriesTransactions.length} old transactions and creating new series`
          );

          // Delete all transactions in the old series
          for (const transaction of seriesTransactions) {
            await deleteTransaction(user.uid, transaction.id);
          }

          // Generate new recurring transactions with new frequency
          const recurringTransactions =
            generateRecurringTransactions(editingTransaction);
          console.log(
            `Generated ${recurringTransactions.length} new transactions with ${newFrequency} frequency`
          );

          // Add each new recurring transaction
          for (const transaction of recurringTransactions) {
            await addTransaction(
              user.uid,
              transaction.description,
              transaction.amount,
              transaction.type,
              transaction.category,
              transaction.date,
              transaction.recurring,
              transaction.isRecurring,
              transaction.recurringSeriesId
            );
          }
        } else if (originalEndDate !== newEndDate) {
          // Handle end date changes
          const originalEndDateObj = originalEndDate
            ? new Date(originalEndDate + 'T23:59:59')
            : null;
          const newEndDateObj = newEndDate
            ? new Date(newEndDate + 'T23:59:59')
            : null;

          // Check if end date was extended (need to generate more transactions)
          if (
            (!originalEndDateObj && newEndDateObj) ||
            (originalEndDateObj &&
              newEndDateObj &&
              newEndDateObj > originalEndDateObj)
          ) {
            console.log(
              `End date extended: ${originalEndDate || 'none'} → ${newEndDate}`
            );

            // Update existing transactions first
            for (const transaction of seriesTransactions) {
              await updateTransaction(user.uid, transaction.id, {
                description: editingTransaction.description,
                amount: parseFloat(editingTransaction.amount),
                type: editingTransaction.type,
                category: editingTransaction.category,
                date: transaction.date,
                recurring: editingTransaction.recurring,
                isRecurring: true,
                recurringSeriesId: editingTransaction.recurringSeriesId,
                recurringEndDate: newEndDate,
              });
            }

            // Recreate the entire series with the new end date to fill in missing transactions
            // This is simpler and more reliable than trying to calculate missing dates
            console.log('Recreating series with extended end date');

            // Delete the existing series
            for (const transaction of seriesTransactions) {
              await deleteTransaction(user.uid, transaction.id);
            }

            // Generate new series with the extended end date
            const newRecurringTransactions =
              generateRecurringTransactions(editingTransaction);
            console.log(
              `Generated ${newRecurringTransactions.length} transactions with extended end date`
            );

            // Add the new transactions
            for (const transaction of newRecurringTransactions) {
              await addTransaction(
                user.uid,
                transaction.description,
                transaction.amount,
                transaction.type,
                transaction.category,
                transaction.date,
                transaction.recurring,
                transaction.isRecurring,
                transaction.recurringSeriesId
              );
            }
          } else {
            // End date was shortened or removed - use the original working logic
            const transactionsToDelete = seriesTransactions.filter(
              (transaction) => {
                const transactionMonth = transaction.date.substring(0, 7);
                if (newEndDate) {
                  const newEndMonth = newEndDate.substring(0, 7);
                  return transactionMonth > newEndMonth;
                }
                return false;
              }
            );

            console.log(
              `End date shortened: ${originalEndDate} → ${newEndDate}`
            );
            console.log(
              `Deleting ${transactionsToDelete.length} transactions after new end date`
            );

            // Delete transactions after new end date
            for (const transaction of transactionsToDelete) {
              await deleteTransaction(user.uid, transaction.id);
            }

            // Update remaining transactions
            const transactionsToKeep = seriesTransactions.filter(
              (transaction) => {
                const transactionMonth = transaction.date.substring(0, 7);
                if (newEndDate) {
                  const newEndMonth = newEndDate.substring(0, 7);
                  return transactionMonth <= newEndMonth;
                }
                return true;
              }
            );

            for (const transaction of transactionsToKeep) {
              await updateTransaction(user.uid, transaction.id, {
                description: editingTransaction.description,
                amount: parseFloat(editingTransaction.amount),
                type: editingTransaction.type,
                category: editingTransaction.category,
                date: transaction.date,
                recurring: editingTransaction.recurring,
                isRecurring: true,
                recurringSeriesId: editingTransaction.recurringSeriesId,
                recurringEndDate: newEndDate,
              });
            }
          }
        } else {
          // Same frequency - just update all transactions in the series
          for (const transaction of seriesTransactions) {
            await updateTransaction(user.uid, transaction.id, {
              description: editingTransaction.description,
              amount: parseFloat(editingTransaction.amount),
              type: editingTransaction.type,
              category: editingTransaction.category,
              // Keep original dates for each transaction
              date: transaction.date,
              recurring: editingTransaction.recurring,
              isRecurring: true,
              recurringSeriesId: editingTransaction.recurringSeriesId,
            });
          }
        }
      }
    } else if (editingTransaction.recurring !== 'none') {
      // Converting regular transaction to recurring
      await deleteTransaction(user.uid, editingTransactionId);

      // Generate new recurring transactions
      const recurringTransactions =
        generateRecurringTransactions(editingTransaction);

      // Add each recurring transaction
      for (const transaction of recurringTransactions) {
        await addTransaction(
          user.uid,
          transaction.description,
          transaction.amount,
          transaction.type,
          transaction.category,
          transaction.date,
          transaction.recurring,
          transaction.isRecurring,
          transaction.recurringSeriesId
        );
      }
    } else {
      // Update single transaction
      await updateTransaction(user.uid, editingTransactionId, {
        description: editingTransaction.description,
        amount: parseFloat(editingTransaction.amount),
        type: editingTransaction.type,
        category: editingTransaction.category,
        date: editingTransaction.date,
        recurring: editingTransaction.recurring,
        isRecurring: false,
      });
    }

    // Reset states
    setEditingTransactionId(null);
    setEditChoice(null);
    setEditingTransaction({
      description: '',
      amount: '',
      type: 'expense',
      category: '',
      date: '',
      recurring: 'none',
      recurringEndDate: '',
    });
    fetchTransactions();
  };

  // Get filtered transactions for the month
  const monthTransactions = getTransactionsForMonth();
  const transactionsWithBalance = calculateRunningBalance(monthTransactions);

  // Calculate monthly totals for the selected month
  const monthlyIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format amount with +/- sign
  const formatAmount = (amount, type) => {
    const formattedAmount = formatCurrency(amount);
    return type === 'income' ? `+${formattedAmount}` : `-${formattedAmount}`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
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
          'take this file (either pdf or csv) and return it to me in a parsed json file of the transactions with the following categories: date, description, amount';

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
    <div className='transactions-layout'>
      {/* Main Content */}
      <div className='main-content'>
        <div className='bank-statement-container'>
          {/* Header */}
          <div className='statement-header'>
            <div className='statement-title'>
              <h1>Transaction Statement</h1>
              <p className='company-name'>Personal Finance Tracker</p>
            </div>
            <div className='statement-date'>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          {/* Controls */}
          <div className='statement-controls'>
            <div className='search-control'>
              <input
                type='text'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='Search transactions...'
                className='search-input'
              />
            </div>

            <button
              className='add-transaction-btn'
              onClick={() => setShowAddModal(true)}
            >
              + Add Transaction
            </button>
            <button
              className='upload-file-btn'
              onClick={handleUploadButtonClick}
            >
              Upload File
            </button>
            {/* Hidden file input */}
            <input
              type='file'
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }} // Hide input visually
              accept='application/pdf, text/csv' // Accepted file types
            />
          </div>

          {/* Current Month Display */}
          <div className='current-period'>
            <h2>{getCurrentMonthName()}</h2>
            <div className='period-badge'>Statement Period</div>
          </div>

          {/* Bank Statement Table */}
          <div className='statement-table-container'>
            <table className='statement-table'>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactionsWithBalance.map((transaction, index) => (
                  <tr
                    key={transaction.id}
                    className={index % 2 === 0 ? 'even-row' : 'odd-row'}
                  >
                    {editingTransactionId === transaction.id ? (
                      <>
                        <td colSpan='4' className='edit-full-row'>
                          <div className='edit-transaction-form'>
                            <div className='edit-row'>
                              <div className='edit-field'>
                                <label>Date:</label>
                                <input
                                  type='date'
                                  value={editingTransaction.date}
                                  onChange={(e) =>
                                    setEditingTransaction({
                                      ...editingTransaction,
                                      date: e.target.value,
                                    })
                                  }
                                  className='edit-input-sm'
                                />
                              </div>
                              <div className='edit-field'>
                                <label>Type:</label>
                                <select
                                  value={editingTransaction.type}
                                  onChange={(e) =>
                                    setEditingTransaction({
                                      ...editingTransaction,
                                      type: e.target.value,
                                    })
                                  }
                                  className='edit-select-sm'
                                >
                                  <option value='income'>Income (+)</option>
                                  <option value='expense'>Expense (-)</option>
                                </select>
                              </div>
                              <div className='edit-field'>
                                <label>Amount:</label>
                                <input
                                  type='number'
                                  value={editingTransaction.amount}
                                  onChange={(e) =>
                                    setEditingTransaction({
                                      ...editingTransaction,
                                      amount: e.target.value,
                                    })
                                  }
                                  className='edit-input-sm'
                                  placeholder='Amount'
                                  step='0.01'
                                />
                              </div>
                            </div>

                            <div className='edit-row'>
                              <div className='edit-field edit-field-wide'>
                                <label>Description:</label>
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
                              </div>
                              <div className='edit-field'>
                                <label>Category:</label>
                                <select
                                  value={editingTransaction.category}
                                  onChange={(e) =>
                                    setEditingTransaction({
                                      ...editingTransaction,
                                      category: e.target.value,
                                    })
                                  }
                                  className='edit-select-sm'
                                >
                                  <option value=''>Select Category</option>
                                  {categories.map((category) => (
                                    <option key={category} value={category}>
                                      {category}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className='edit-row'>
                              <div className='edit-field'>
                                <label>Recurring:</label>
                                <select
                                  value={editingTransaction.recurring}
                                  onChange={(e) =>
                                    setEditingTransaction({
                                      ...editingTransaction,
                                      recurring: e.target.value,
                                    })
                                  }
                                  className='edit-select-sm'
                                >
                                  <option value='none'>One-time</option>
                                  <option value='weekly'>Weekly</option>
                                  <option value='monthly'>Monthly</option>
                                  <option value='annually'>Annually</option>
                                </select>
                              </div>
                              {editingTransaction.recurring !== 'none' && (
                                <div className='edit-field'>
                                  <label>End Date:</label>
                                  <input
                                    type='date'
                                    value={editingTransaction.recurringEndDate}
                                    onChange={(e) =>
                                      setEditingTransaction({
                                        ...editingTransaction,
                                        recurringEndDate: e.target.value,
                                      })
                                    }
                                    className='edit-input-sm'
                                  />
                                </div>
                              )}
                              <div className='edit-field'>
                                <label>Actions:</label>
                                <div className='edit-actions'>
                                  <button
                                    onClick={handleSave}
                                    className='save-btn-sm'
                                  >
                                    ✓ Save
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className='cancel-btn-sm'
                                  >
                                    ✕ Cancel
                                  </button>
                                </div>
                              </div>
                            </div>

                            {editingTransaction.recurring !== 'none' && (
                              <div className='edit-note'>
                                <small>
                                  Note: Editing a recurring transaction will
                                  replace the original with a new recurring
                                  series.
                                </small>
                              </div>
                            )}

                            {editingTransaction.recurringSeriesId &&
                              editChoice === 'all-series' &&
                              editingTransaction.recurring !== 'none' &&
                              (() => {
                                const originalTransaction = transactions.find(
                                  (t) => t.id === editingTransactionId
                                );
                                const originalFrequency =
                                  originalTransaction?.recurring;
                                const originalEndDate =
                                  originalTransaction?.recurringEndDate || '';
                                const newFrequency =
                                  editingTransaction.recurring;
                                const newEndDate =
                                  editingTransaction.recurringEndDate || '';
                                return (
                                  originalFrequency &&
                                  (originalFrequency !== newFrequency ||
                                    originalEndDate !== newEndDate)
                                );
                              })() && (
                                <div className='frequency-change-warning'>
                                  <strong>
                                    ⚠️ Recurring Settings Change Detected:
                                  </strong>
                                  <br />
                                  <small>
                                    {(() => {
                                      const originalTransaction =
                                        transactions.find(
                                          (t) => t.id === editingTransactionId
                                        );
                                      const originalFrequency =
                                        originalTransaction?.recurring;
                                      const originalEndDate =
                                        originalTransaction?.recurringEndDate ||
                                        '';
                                      const newFrequency =
                                        editingTransaction.recurring;
                                      const newEndDate =
                                        editingTransaction.recurringEndDate ||
                                        '';

                                      const frequencyChanged =
                                        originalFrequency !== newFrequency;
                                      const endDateChanged =
                                        originalEndDate !== newEndDate;

                                      if (frequencyChanged && endDateChanged) {
                                        return (
                                          <>
                                            Changing frequency from{' '}
                                            <strong>{originalFrequency}</strong>{' '}
                                            to <strong>{newFrequency}</strong>{' '}
                                            and end date from{' '}
                                            <strong>
                                              {originalEndDate || 'none'}
                                            </strong>{' '}
                                            to{' '}
                                            <strong>
                                              {newEndDate || 'none'}
                                            </strong>{' '}
                                            will recreate the entire series
                                          </>
                                        );
                                      } else if (frequencyChanged) {
                                        return (
                                          <>
                                            Changing frequency from{' '}
                                            <strong>{originalFrequency}</strong>{' '}
                                            to <strong>{newFrequency}</strong>{' '}
                                            will recreate the entire series
                                          </>
                                        );
                                      } else if (endDateChanged) {
                                        const originalEndDateObj =
                                          originalEndDate
                                            ? new Date(
                                                originalEndDate + 'T23:59:59'
                                              )
                                            : null;
                                        const newEndDateObj = newEndDate
                                          ? new Date(newEndDate + 'T23:59:59')
                                          : null;

                                        if (
                                          (!originalEndDateObj &&
                                            newEndDateObj) ||
                                          (originalEndDateObj &&
                                            newEndDateObj &&
                                            newEndDateObj > originalEndDateObj)
                                        ) {
                                          return (
                                            <>
                                              Changing end date from{' '}
                                              <strong>
                                                {originalEndDate || 'none'}
                                              </strong>{' '}
                                              to <strong>{newEndDate}</strong>{' '}
                                              will recreate the series with the
                                              extended end date
                                            </>
                                          );
                                        } else {
                                          return (
                                            <>
                                              Changing end date from{' '}
                                              <strong>{originalEndDate}</strong>{' '}
                                              to{' '}
                                              <strong>
                                                {newEndDate || 'none'}
                                              </strong>{' '}
                                              will delete transactions after the
                                              new end date
                                            </>
                                          );
                                        }
                                      }
                                    })()}
                                    <br />
                                    {(() => {
                                      const originalTransaction =
                                        transactions.find(
                                          (t) => t.id === editingTransactionId
                                        );
                                      const originalFrequency =
                                        originalTransaction?.recurring;
                                      const originalEndDate =
                                        originalTransaction?.recurringEndDate ||
                                        '';
                                      const newFrequency =
                                        editingTransaction.recurring;
                                      const newEndDate =
                                        editingTransaction.recurringEndDate ||
                                        '';
                                      const frequencyChanged =
                                        originalFrequency !== newFrequency;
                                      const endDateChanged =
                                        originalEndDate !== newEndDate;

                                      if (frequencyChanged) {
                                        return (
                                          <>
                                            • Delete all existing transactions
                                            in this series
                                            <br />• Create new transactions with{' '}
                                            {newFrequency} frequency
                                            <br />• Generate proper spacing
                                            based on the new frequency
                                          </>
                                        );
                                      } else if (endDateChanged) {
                                        const originalEndDateObj =
                                          originalEndDate
                                            ? new Date(
                                                originalEndDate + 'T23:59:59'
                                              )
                                            : null;
                                        const newEndDateObj = newEndDate
                                          ? new Date(newEndDate + 'T23:59:59')
                                          : null;

                                        if (
                                          (!originalEndDateObj &&
                                            newEndDateObj) ||
                                          (originalEndDateObj &&
                                            newEndDateObj &&
                                            newEndDateObj > originalEndDateObj)
                                        ) {
                                          return (
                                            <>
                                              • Delete existing series and
                                              recreate with extended end date
                                              <br />• Include all transactions
                                              from start to new end date
                                            </>
                                          );
                                        } else {
                                          return (
                                            <>
                                              • Delete transactions after new
                                              end date
                                              <br />• Update remaining
                                              transactions with new details
                                            </>
                                          );
                                        }
                                      } else {
                                        return (
                                          <>
                                            • Update all transactions with new
                                            details
                                            <br />• Keep existing dates and
                                            frequency
                                          </>
                                        );
                                      }
                                    })()}
                                  </small>
                                </div>
                              )}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className='date-cell'>
                          {formatDate(transaction.date)}
                        </td>
                        <td className='description-cell'>
                          <div className='description-main'>
                            {transaction.description}
                            {transaction.isRecurring && (
                              <span
                                className='recurring-badge'
                                title='Recurring Transaction'
                              >
                                🔄
                              </span>
                            )}
                          </div>
                          {transaction.category && (
                            <div className='description-category'>
                              {transaction.category}
                            </div>
                          )}
                        </td>
                        <td className={`amount-cell ${transaction.type}`}>
                          {formatAmount(transaction.amount, transaction.type)}
                        </td>
                        <td className='actions-cell'>
                          <button
                            onClick={() => handleEdit(transaction)}
                            className='edit-btn-sm'
                            title='Edit'
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className='delete-btn-sm'
                            title='Delete'
                          >
                            🗑️
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty state */}
            {transactionsWithBalance.length === 0 && (
              <div className='empty-statement'>
                <p>No transaction was added</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className='add-first-transaction'
                >
                  Add your first transaction
                </button>
              </div>
            )}
          </div>

          {/* Monthly Income Summary */}
          {transactionsWithBalance.length > 0 && (
            <div className='account-balance-summary'>
              <div className='balance-info'>
                <span>Monthly Income:</span>
                <span
                  className={`current-balance ${
                    monthlyIncome - monthlyExpenses >= 0
                      ? 'positive'
                      : 'negative'
                  }`}
                >
                  {formatCurrency(monthlyIncome - monthlyExpenses)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Month Selector Sidebar */}
      <div className='month-selector-sidebar'>
        <h3>Select Month</h3>
        <div className='month-boxes'>
          {getMonthOptions().map((option) => (
            <div
              key={option.value}
              className={`month-box ${
                selectedMonth === option.value ? 'active' : ''
              }`}
              onClick={() => setSelectedMonth(option.value)}
            >
              <div className='month-box-month'>
                {option.shortLabel.split(' ')[0]}
              </div>
              <div className='month-box-year'>
                {option.shortLabel.split(' ')[1]}
              </div>
            </div>
          ))}
        </div>
      </div>

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
                <option value='expense'>Expense </option>
                <option value='income'>Income </option>
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

              {/* Recurring Options */}
              <div className='recurring-section'>
                <label className='recurring-label'>
                  Recurring Transaction:
                </label>
                <select
                  value={newTransaction.recurring}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      recurring: e.target.value,
                    })
                  }
                  className='modal-select'
                >
                  <option value='none'>One-time Transaction</option>
                  <option value='weekly'>Weekly</option>
                  <option value='monthly'>Monthly</option>
                  <option value='annually'>Annually</option>
                </select>

                {newTransaction.recurring !== 'none' && (
                  <>
                    <label className='recurring-label'>
                      End Date (optional):
                    </label>
                    <input
                      type='date'
                      value={newTransaction.recurringEndDate}
                      onChange={(e) =>
                        setNewTransaction({
                          ...newTransaction,
                          recurringEndDate: e.target.value,
                        })
                      }
                      className='modal-input'
                      placeholder='Leave empty for 1 year'
                    />
                    <small className='recurring-note'>
                      If no end date is provided, transactions will be created
                      for 1 year.
                    </small>
                  </>
                )}
              </div>
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

      {/* Recurring Edit Choice Modal */}
      {showRecurringEditModal && (
        <div className='modal-overlay'>
          <div className='modal-content'>
            <div className='modal-header'>
              <h2>Edit Recurring Transaction</h2>
              <button
                className='modal-close'
                onClick={() => setShowRecurringEditModal(false)}
              >
                ×
              </button>
            </div>
            <div className='modal-body'>
              <p className='recurring-choice-text'>
                This is part of a recurring transaction series. What would you
                like to edit?
              </p>
              <div className='recurring-choice-buttons'>
                <button
                  className='choice-btn this-one-btn'
                  onClick={() => handleRecurringEditChoice('this-one')}
                >
                  <div className='choice-icon'>📝</div>
                  <div className='choice-content'>
                    <div className='choice-title'>Edit This One Only</div>
                    <div className='choice-description'>
                      Change only this transaction. It will be removed from the
                      recurring series.
                    </div>
                  </div>
                </button>

                <button
                  className='choice-btn all-series-btn'
                  onClick={() => handleRecurringEditChoice('all-series')}
                >
                  <div className='choice-icon'>🔄</div>
                  <div className='choice-content'>
                    <div className='choice-title'>Edit All in Series</div>
                    <div className='choice-description'>
                      Apply changes to all transactions in this recurring
                      series.
                    </div>
                  </div>
                </button>
              </div>
            </div>
            <div className='modal-footer'>
              <button
                onClick={() => setShowRecurringEditModal(false)}
                className='modal-cancel-btn'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Delete Choice Modal */}
      {showRecurringDeleteModal && (
        <div className='modal-overlay'>
          <div className='modal-content'>
            <div className='modal-header'>
              <h2>Delete Recurring Transaction</h2>
              <button
                className='modal-close'
                onClick={() => setShowRecurringDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className='modal-body'>
              <p className='recurring-choice-text'>
                This is part of a recurring transaction series. What would you
                like to delete?
              </p>
              <div className='recurring-choice-buttons'>
                <button
                  className='choice-btn this-one-btn delete-this-btn'
                  onClick={() => handleRecurringDeleteChoice('this-one')}
                >
                  <div className='choice-icon'>🗑️</div>
                  <div className='choice-content'>
                    <div className='choice-title'>Delete This One Only</div>
                    <div className='choice-description'>
                      Remove only this transaction. Other transactions in the
                      series will remain.
                    </div>
                  </div>
                </button>

                <button
                  className='choice-btn all-series-btn delete-all-btn'
                  onClick={() => handleRecurringDeleteChoice('all-series')}
                >
                  <div className='choice-icon'>💀</div>
                  <div className='choice-content'>
                    <div className='choice-title'>Delete Entire Series</div>
                    <div className='choice-description'>
                      Remove all{' '}
                      {(() => {
                        const transaction = transactions.find(
                          (t) => t.id === deletingTransactionId
                        );
                        const count = transactions.filter(
                          (t) =>
                            t.recurringSeriesId ===
                            transaction?.recurringSeriesId
                        ).length;
                        return count;
                      })()}{' '}
                      transactions in this recurring series.
                    </div>
                  </div>
                </button>
              </div>
            </div>
            <div className='modal-footer'>
              <button
                onClick={() => setShowRecurringDeleteModal(false)}
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
