import { db } from "../auth/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

export const getGoals = async (userId) => {
  const goalsRef = collection(db, "users", userId, "goals");
  const snapshot = await getDocs(goalsRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addGoal = async (userId, title, dueDate, notes) => {
  const goalsRef = collection(db, "users", userId, "goals");
  await addDoc(goalsRef, {
    title,
    progress: 0,
    dueDate,
    notes,
    createdAt: serverTimestamp(),
  });
};

export const updateGoal = async (userId, goalId, data) => {
  const goalRef = doc(db, "users", userId, "goals", goalId);
  await updateDoc(goalRef, data);
};

export const deleteGoal = async (userId, goalId) => {
  const goalRef = doc(db, "users", userId, "goals", goalId);
  await deleteDoc(goalRef);
};
