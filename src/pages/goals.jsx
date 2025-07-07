import { useEffect, useState } from "react";
import { getGoals, addGoal, deleteGoal, updateGoal } from "../firebase/goalsService";
import { auth } from "../auth/firebaseConfig";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState("");

  const fetchGoals = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const data = await getGoals(user.uid);
    setGoals(data);
  };

  const handleAdd = async () => {
    const user = auth.currentUser;
    if (!user || !newGoal) return;
    await addGoal(user.uid, newGoal);
    setNewGoal("");
    fetchGoals();
  };

  const handleDelete = async (goalId) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteGoal(user.uid, goalId);
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
      <button onClick={handleAdd}>Add Goal</button>

      <ul>
        {goals.map((goal) => (
          <li key={goal.id}>
            <strong>{goal.title}</strong> - {goal.progress}%
            <button onClick={() => handleDelete(goal.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
