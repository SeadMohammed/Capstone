import { db } from "../auth/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

//get existing goals from Firestore DB
export const getGoals = async (userId) => {
  const goalsRef = collection(db, "users", userId, "goals");
  const q = query(goalsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

//add a goal to Firestore DB
export const addGoal = async (userId, title, dueDate, notes, targetAmount, currentAmount, priority) => {
  const goalsRef = collection(db, "users", userId, "goals");
  await addDoc(goalsRef, {
    title,
    dueDate,
    notes,
    targetAmount: targetAmount ? parseFloat(targetAmount) : 0,
    currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
    priority: priority || "medium",
    createdAt: serverTimestamp(),
  });
};

//update existing goal in firebase DB
export const updateGoal = async (userId, goalId, data) => {
  const goalRef = doc(db, "users", userId, "goals", goalId);
  // Convert amounts to numbers if they exist
  if (data.targetAmount) data.targetAmount = parseFloat(data.targetAmount);
  if (data.currentAmount) data.currentAmount = parseFloat(data.currentAmount);
  await updateDoc(goalRef, data);
};

//delete an existing goal from the Firebase DB
export const deleteGoal = async (userId, goalId) => {
  const goalRef = doc(db, "users", userId, "goals", goalId);
  await deleteDoc(goalRef);
}; 