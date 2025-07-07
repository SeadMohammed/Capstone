import { useEffect, useState } from "react";
import { getGoals, addGoal, deleteGoal, updateGoal } from "../firebase/goalsService";
import { auth } from "../auth/firebaseConfig";

export default function Goals() {
  //page elements
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  //editing
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDueDate, setEditingDueDate] = useState("");
  const [editingNotes, setEditingNotes] = useState("");

  
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
    await addGoal(user.uid, newGoal, dueDate, notes);
    setNewGoal("");
    setDueDate("");
    setNotes("");
    fetchGoals();
  };

  //handler for deleting an exisitng goal
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
  };

  //handler for when you cancel editing a goal
  const handleCancel = () => {
    setEditingGoalId(null);
    setEditingTitle("");
    setEditingDueDate("");
    setEditingNotes("");
  };

  // Save edited goal title, date, notes
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !editingTitle) return;
    await updateGoal(user.uid, editingGoalId, { 
      title: editingTitle,
      dueDate: editingDueDate,
      notes: editingNotes,
     });
    setEditingGoalId(null);
    setEditingTitle(""); 
    setEditingDueDate("");
    setEditingNotes("");
    fetchGoals();
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  return (
    <div>
      <h1>Your Goals</h1>
      <input
        value={newGoal}
        onChange={(e) => setNewGoal(e.target.value)}
        placeholder="New goal title"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        placeholder="Date your goal is due"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Goal Notes"
        rows={2}
      />
      <button onClick={handleAdd}>Add Goal</button>

      <ul>
        {goals.map((goal) => (
          <li key={goal.id}>
            {editingGoalId === goal.id ? (
              <>
                <input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                />
                <input
                  type="date"
                  value={editingDueDate}
                  onChange={(e) => setEditingDueDate(e.target.value)}
                />
                <textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  rows={2}
                />
                <button onClick={handleSave}>Save</button>
                <button onClick={handleCancel}>Cancel</button>
              </>
            ) : (
              <>
                <strong>{goal.title}</strong> - {goal.progress}%
                {goal.dueDate && <div>Due: {goal.dueDate}</div>}
                {goal.notes && <div>Notes: {goal.notes}</div>}
                <button onClick={() => handleEdit(goal)}>Edit</button>
                <button onClick={() => handleDelete(goal.id)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
