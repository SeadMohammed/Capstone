import { useEffect, useState } from "react";
import { getGoals, addGoal, deleteGoal, updateGoal } from "../firebase/goalsService";
import { auth } from "../auth/firebaseConfig";

export default function Goals() {
  // Page elements
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [priority, setPriority] = useState("medium");

  // Editing state
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDueDate, setEditingDueDate] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [editingTargetAmount, setEditingTargetAmount] = useState("");
  const [editingCurrentAmount, setEditingCurrentAmount] = useState("");
  const [editingPriority, setEditingPriority] = useState("medium");

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchDate, setSearchDate] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Categories
  const priorities = ["high", "medium", "low"];
  
  // Fetch all the goals from Firestore
  const fetchGoals = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const data = await getGoals(user.uid);
      setGoals(data);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  // Handler for adding a new goal
  const handleAdd = async () => {
    const user = auth.currentUser;
    if (!user || !newGoal) {
      console.warn("User not authenticated or goal title is empty.");
      return;
    }
    try {
      await addGoal(user.uid, newGoal, dueDate, notes, targetAmount, currentAmount, priority);
      setNewGoal("");
      setDueDate("");
      setNotes("");
      setTargetAmount("");
      setCurrentAmount("");
      setPriority("medium");
      setShowAddModal(false);
      fetchGoals(); // Refresh goals after adding
    } catch (error) {
      console.error("Error adding goal:", error);
    }
  };

  // Handler for deleting an existing goal
  const handleDelete = async (goalId) => {
    const user = auth.currentUser;
    if (!user) {
      console.warn("User not authenticated.");
      return;
    }
    try {
      await deleteGoal(user.uid, goalId);
      fetchGoals(); // Refresh goals after deleting
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  // Handler for when you start editing a goal
  const handleEdit = (goal) => {
    setEditingGoalId(goal.id);
    setEditingTitle(goal.title);
    setEditingDueDate(goal.dueDate);
    setEditingNotes(goal.notes);
    setEditingTargetAmount(goal.targetAmount || "");
    setEditingCurrentAmount(goal.currentAmount || "");
    setEditingPriority(goal.priority || "medium");
  };

  // Handler for when you cancel editing a goal
  const handleCancel = () => {
    setEditingGoalId(null);
    setEditingTitle("");
    setEditingDueDate("");
    setEditingNotes("");
    setEditingTargetAmount("");
    setEditingCurrentAmount("");
    setEditingPriority("medium");
  };

  // Save edited goal
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !editingTitle) {
      console.warn("User not authenticated or goal title is empty.");
      return;
    }
    try {
      await updateGoal(user.uid, editingGoalId, { 
        title: editingTitle,
        dueDate: editingDueDate,
        notes: editingNotes,
        targetAmount: editingTargetAmount,
        currentAmount: editingCurrentAmount,
        priority: editingPriority,
      });
      setEditingGoalId(null);
      setEditingTitle(""); 
      setEditingDueDate("");
      setEditingNotes("");
      setEditingTargetAmount("");
      setEditingCurrentAmount("");
      setEditingPriority("medium");
      fetchGoals(); // Refresh goals after saving
    } catch (error) {
      console.error("Error saving goal:", error);
    }
  };

  // Calculate progress percentage
  const getProgress = (current, target) => {
    if (!current || !target) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // Get days left until due date
  const getDaysLeft = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get progress color based on percentage
  const getProgressColor = (progress) => {
    if (progress >= 80) return '#10b981'; // green
    if (progress >= 60) return '#f59e0b'; // yellow
    if (progress >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
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

  // Filter and sort goals with smart priority
  const filteredAndSortedGoals = goals
    .filter(goal => {
      // Filter by date search (if provided)
      const matchesDate = !searchDate || goal.dueDate === searchDate;
      
      // Filter by priority (if not "all")
      const matchesPriority = priorityFilter === "all" || goal.priority === priorityFilter;
      
      return matchesDate && matchesPriority;
    })
    .sort((a, b) => {
      // First priority: Due items (overdue or due today)
      const today = new Date().toISOString().split('T')[0];
      const aDaysLeft = getDaysLeft(a.dueDate);
      const bDaysLeft = getDaysLeft(b.dueDate);
      
      // Check if items are due (0 days left or overdue)
      const aIsDue = aDaysLeft !== null && aDaysLeft <= 0;
      const bIsDue = bDaysLeft !== null && bDaysLeft <= 0;
      
      if (aIsDue && !bIsDue) return -1; // a comes first
      if (!aIsDue && bIsDue) return 1;  // b comes first
      
      // If both are due or both are not due, sort by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      // If same priority, sort by due date (soonest first)
      if (aDaysLeft !== null && bDaysLeft !== null) {
        return aDaysLeft - bDaysLeft;
      }
      
      // If one has no due date, prioritize the one with a due date
      if (aDaysLeft === null && bDaysLeft !== null) return 1;
      if (aDaysLeft !== null && bDaysLeft === null) return -1;
      
      // If both have no due date, maintain original order
      return 0;
    });

  // Fetch goals on component mount
  useEffect(() => {
    fetchGoals();
  }, []);

  return (
    <div className="goals-dashboard p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen font-inter">
      <div className="dashboard-header flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="dashboard-title text-3xl sm:text-4xl font-bold text-gray-800 mb-4 sm:mb-0">Goals</h1>
        <button 
          className="add-metric-btn bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out" 
          onClick={() => setShowAddModal(true)}
        >
          + Add Metric
        </button>
      </div>

      <div className="dashboard-filters flex flex-col md:flex-row gap-4 mb-8 p-4 bg-white rounded-lg shadow-sm">
        <div className="filter-group flex flex-col flex-grow">
          <span className="text-gray-700 font-medium mb-1">Search by Date</span>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="filter-input p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="filter-group flex flex-col flex-grow">
          <span className="text-gray-700 font-medium mb-1">Priority</span>
          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="filter-select p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">🔥 High Priority</option>
            <option value="medium">⚡ Medium Priority</option>
            <option value="low">🌱 Low Priority</option>
          </select>
        </div>
        <div className="filter-group flex flex-col justify-end">
          <button 
            onClick={() => {
              setSearchDate("");
              setPriorityFilter("all");
            }}
            className="clear-filters-btn bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-sm transition duration-300 ease-in-out mt-auto"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="metrics-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAndSortedGoals.map((goal) => {
          const progress = getProgress(goal.currentAmount, goal.targetAmount);
          const daysLeft = getDaysLeft(goal.dueDate);
          const progressColor = getProgressColor(progress);
          
          return (
            <div key={goal.id} className="metric-card bg-white rounded-lg shadow-md p-6 flex flex-col justify-between">
              {editingGoalId === goal.id ? (
                <div className="edit-form flex flex-col space-y-3">
                  <input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="edit-input p-2 border border-gray-300 rounded-md"
                    placeholder="Goal title"
                  />
                  <input
                    type="number"
                    value={editingCurrentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="edit-input p-2 border border-gray-300 rounded-md"
                    placeholder="Current amount"
                  />
                  <input
                    type="number"
                    value={editingTargetAmount}
                    onChange={(e) => setEditingTargetAmount(e.target.value)}
                    className="edit-input p-2 border border-gray-300 rounded-md"
                    placeholder="Target amount"
                  />
                  <input
                    type="date"
                    value={editingDueDate}
                    onChange={(e) => setEditingDueDate(e.target.value)}
                    className="edit-input p-2 border border-gray-300 rounded-md"
                  />
                  <select
                    value={editingPriority}
                    onChange={(e) => setEditingPriority(e.target.value)}
                    className="edit-select p-2 border border-gray-300 rounded-md"
                  >
                    <option value="high">🔥 High Priority</option>
                    <option value="medium">⚡ Medium Priority</option>
                    <option value="low">🌱 Low Priority</option>
                  </select>
                  <textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    className="edit-textarea p-2 border border-gray-300 rounded-md resize-y"
                    placeholder="Notes"
                    rows={2}
                  />
                  <div className="edit-buttons flex justify-end gap-2 mt-4">
                    <button onClick={handleSave} className="save-btn bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">Save</button>
                    <button onClick={handleCancel} className="cancel-btn bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="metric-header flex justify-between items-start mb-3">
                    <div className={`metric-period text-sm font-semibold ${daysLeft !== null && daysLeft <= 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {daysLeft !== null ? (
                        daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'
                      ) : 'No due date'}
                    </div>
                    <div className="metric-actions flex items-center gap-2">
                      <div className="priority-indicator text-sm font-semibold flex items-center gap-1" style={{ color: getPriorityColor(goal.priority) }}>
                        {getPriorityIcon(goal.priority)} {goal.priority || 'medium'}
                      </div>
                      <button onClick={() => handleEdit(goal)} className="edit-icon text-gray-500 hover:text-blue-600 transition duration-200 ease-in-out">✏️</button>
                      <button onClick={() => handleDelete(goal.id)} className="delete-icon text-gray-500 hover:text-red-600 transition duration-200 ease-in-out">🗑️</button>
                    </div>
                  </div>
                  
                  <div className="metric-title text-xl font-bold text-gray-800 mb-2">{goal.title}</div>
                  
                  <div className="metric-value text-2xl font-extrabold mb-2">
                    <span className="progress-percentage" style={{ color: progressColor }}>
                      {progress}%
                    </span>
                  </div>
                  
                  <div className="metric-amount text-sm text-gray-600 mb-4">
                    ${goal.currentAmount || 0}
                    {goal.targetAmount && (
                      <span className="target-amount"> / ${goal.targetAmount}</span>
                    )}
                  </div>
                  
                  <div className="progress-bar w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div 
                      className="progress-fill h-2.5 rounded-full" 
                      style={{ 
                        width: `${progress}%`,
                        backgroundColor: progressColor 
                      }}
                    ></div>
                  </div>
                  
                  <div className="metric-footer mt-auto pt-4 border-t border-gray-100">
                    <div className="progress-text text-sm font-semibold mb-2">
                      <span style={{ color: progressColor }}>
                        {progress >= 100 ? '✓ Goal achieved!' : 
                         progress >= 80 ? '▲ Above target' : 
                         progress >= 50 ? '▲ On track' : 
                         '▼ Below target'}
                      </span>
                    </div>
                    {goal.notes && (
                      <div className="goal-notes text-xs text-gray-500 italic bg-gray-50 p-2 rounded-md max-h-16 overflow-y-auto">
                        {goal.notes}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
        
        {/* Create New Goal Card */}
        <div 
          className="metric-card create-goal-card bg-white rounded-lg shadow-md p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition duration-200 ease-in-out" 
          onClick={() => setShowAddModal(true)}
        >
          <div className="create-goal-content text-center">
            <div className="create-goal-icon text-6xl text-gray-400 mb-2">+</div>
            <div className="create-goal-text text-lg font-semibold text-gray-600">Create New Goal</div>
          </div>
        </div>
      </div>
      
      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="modal-content bg-white rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all scale-100 opacity-100">
            <div className="modal-header flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Add New Goal</h2>
              <button className="modal-close text-gray-500 hover:text-gray-700 text-3xl leading-none" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body flex flex-col space-y-4 mb-6">
              <input
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Goal title"
                className="modal-input p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="number"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="Current amount"
                className="modal-input p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="Target amount"
                className="modal-input p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="modal-input p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="modal-select p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="high">🔥 High Priority</option>
                <option value="medium">⚡ Medium Priority</option>
                <option value="low">🌱 Low Priority</option>
              </select>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Goal notes"
                rows={3}
                className="modal-textarea p-2 border border-gray-300 rounded-md resize-y focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="modal-footer flex justify-end gap-3">
              <button onClick={handleAdd} className="modal-save-btn bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">Add Goal</button>
              <button onClick={() => setShowAddModal(false)} className="modal-cancel-btn bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}