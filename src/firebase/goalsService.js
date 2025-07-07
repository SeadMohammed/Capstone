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

//get exsisting goals from Firestore DB
export const getGoals = async (userId) => {
  const goalsRef = collection(db, "users", userId, "goals");
  const snapshot = await getDocs(goalsRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

//add a goal to Firestore DB (title, progress, date, notes, timestamp)
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

//update exsisting goal in firebase DB
export const updateGoal = async (userId, goalId, data) => {
  const goalRef = doc(db, "users", userId, "goals", goalId);
  await updateDoc(goalRef, data);
};

//delete an exsisting goal from the Firebase DB
export const deleteGoal = async (userId, goalId) => {
  const goalRef = doc(db, "users", userId, "goals", goalId);
  await deleteDoc(goalRef);
};
