import { useEffect, useState } from "react";
import { getGoals, addGoal, deleteGoal, updateGoal } from "../firebase/goalsService";
import { auth } from "../auth/firebaseConfig";

export default function Goals() {
  //page elements
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [priority, setPriority] = useState("medium");

  //editing
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDueDate, setEditingDueDate] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [editingTargetAmount, setEditingTargetAmount] = useState("");
  const [editingCurrentAmount, setEditingCurrentAmount] = useState("");
  const [editingPriority, setEditingPriority] = useState("medium");

  //modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchDate, setSearchDate] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Categories
  const priorities = ["high", "medium", "low"];

  //fetch all the goals
  const fetchGoals = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const data = await getGoals(user.uid);
    setGoals(data);
  };

  //handler for adding a new goal
  const handleAdd = async () => {
    const user = auth.currentUser;
    if (!user || !newGoal) return;
    await addGoal(user.uid, newGoal, dueDate, notes, targetAmount, currentAmount, priority);
    setNewGoal("");
    setDueDate("");
    setNotes("");
    setTargetAmount("");
    setCurrentAmount("");
    setPriority("medium");
    setShowAddModal(false);
    fetchGoals();
  };

  //handler for deleting an existing goal
  const handleDelete = async (goalId) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteGoal(user.uid, goalId);
    fetchGoals();
  };

  //handler for when you start editing a goal
  const handleEdit = (goal) => {
    setEditingGoalId(goal.id);
    setEditingTitle(goal.title);
    setEditingDueDate(goal.dueDate);
    setEditingNotes(goal.notes);
    setEditingTargetAmount(goal.targetAmount || "");
    setEditingCurrentAmount(goal.currentAmount || "");
    setEditingPriority(goal.priority || "medium");
  };

  //handler for when you cancel editing a goal
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
    if (!user || !editingTitle) return;
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
    fetchGoals();
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
      if (aDaysLeft !== null && bDaysLeft === null) return -1;
      if (aDaysLeft === null && bDaysLeft !== null) return 1;
      
      // If both have no due date, maintain original order
      return 0;
    });

  useEffect(() => {
    fetchGoals();
  }, []);

  return (
    <div className="goals-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Goals</h1>
        <button className="add-metric-btn" onClick={() => setShowAddModal(true)}>
          + Add metric
        </button>
      </div>

      <div className="dashboard-filters">
        <div className="filter-group">
          <span>Search by Date</span>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <span>Priority</span>
          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Priorities</option>
            <option value="high">🔥 High Priority</option>
            <option value="medium">⚡ Medium Priority</option>
            <option value="low">🌱 Low Priority</option>
          </select>
        </div>
        <div className="filter-group">
          <span>Clear Filters</span>
          <button 
            onClick={() => {
              setSearchDate("");
              setPriorityFilter("all");
            }}
            className="clear-filters-btn"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        {filteredAndSortedGoals.map((goal) => {
          const progress = getProgress(goal.currentAmount, goal.targetAmount);
          const daysLeft = getDaysLeft(goal.dueDate);
          const progressColor = getProgressColor(progress);
          
          return (
            <div key={goal.id} className="metric-card">
              {editingGoalId === goal.id ? (
                <div className="edit-form">
                  <input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="edit-input"
                    placeholder="Goal title"
                  />
                  <input
                    type="number"
                    value={editingCurrentAmount}
                    onChange={(e) => setEditingCurrentAmount(e.target.value)}
                    className="edit-input"
                    placeholder="Current amount"
                  />
                  <input
                    type="number"
                    value={editingTargetAmount}
                    onChange={(e) => setEditingTargetAmount(e.target.value)}
                    className="edit-input"
                    placeholder="Target amount"
                  />
                  <input
                    type="date"
                    value={editingDueDate}
                    onChange={(e) => setEditingDueDate(e.target.value)}
                    className="edit-input"
                  />
                  <select
                    value={editingPriority}
                    onChange={(e) => setEditingPriority(e.target.value)}
                    className="edit-select"
                  >
                    <option value="high">🔥 High Priority</option>
                    <option value="medium">⚡ Medium Priority</option>
                    <option value="low">🌱 Low Priority</option>
                  </select>
                  <textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    className="edit-textarea"
                    placeholder="Notes"
                    rows={2}
                  />
                  <div className="edit-buttons">
                    <button onClick={handleSave} className="save-btn">Save</button>
                    <button onClick={handleCancel} className="cancel-btn">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="metric-header">
                    <div className="metric-period">
                      {daysLeft !== null ? (
                        daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'
                      ) : 'No due date'}
                    </div>
                    <div className="metric-actions">
                      <div className="priority-indicator" style={{ color: getPriorityColor(goal.priority) }}>
                        {getPriorityIcon(goal.priority)} {goal.priority || 'medium'}
                      </div>
                      <button onClick={() => handleEdit(goal)} className="edit-icon">✏️</button>
                      <button onClick={() => handleDelete(goal.id)} className="delete-icon">🗑️</button>
                    </div>
                  </div>
                  
                  <div className="metric-title">{goal.title}</div>
                  
                  <div className="metric-value">
                    <span className="progress-percentage" style={{ color: progressColor }}>
                      {progress}%
                    </span>
                  </div>
                  
                  <div className="metric-amount">
                    ${goal.currentAmount || 0}
                    {goal.targetAmount && (
                      <span className="target-amount"> / ${goal.targetAmount}</span>
                    )}
                  </div>
                  
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${progress}%`,
                        backgroundColor: progressColor 
                      }}
                    ></div>
                  </div>
                  
                  <div className="metric-footer">
                    <div className="progress-text">
                      <span style={{ color: progressColor }}>
                        {progress >= 100 ? '✓ Goal achieved!' : 
                         progress >= 80 ? '▲ Above target' : 
                         progress >= 50 ? '▲ On track' : 
                         '▼ Below target'}
                      </span>
                    </div>
                    {goal.notes && (
                      <div className="goal-notes">{goal.notes}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
        
        {/* Create New Goal Card */}
        <div className="metric-card create-goal-card" onClick={() => setShowAddModal(true)}>
          <div className="create-goal-content">
            <div className="create-goal-icon">+</div>
            <div className="create-goal-text">Create New Goal</div>
          </div>
        </div>
      </div>

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Goal</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <input
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Goal title"
                className="modal-input"
              />
              <input
                type="number"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="Current amount"
                className="modal-input"
              />
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="Target amount"
                className="modal-input"
              />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="modal-input"
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="modal-select"
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
                className="modal-textarea"
              />
            </div>
            <div className="modal-footer">
              <button onClick={handleAdd} className="modal-save-btn">Add Goal</button>
              <button onClick={() => setShowAddModal(false)} className="modal-cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
