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

//get existing transactions from Firestore DB
export const getTransactions = async (userId) => {
  const transactionsRef = collection(db, "users", userId, "transactions");
  const q = query(transactionsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

//add a transaction to Firestore DB
export const addTransaction = async (userId, description, amount, type, category, date) => {
  const transactionsRef = collection(db, "users", userId, "transactions");
  await addDoc(transactionsRef, {
    description,
    amount: parseFloat(amount),
    type, // 'income' or 'expense'
    category,
    date,
    createdAt: serverTimestamp(),
  });
};

//update existing transaction in firebase DB
export const updateTransaction = async (userId, transactionId, data) => {
  const transactionRef = doc(db, "users", userId, "transactions", transactionId);
  await updateDoc(transactionRef, data);
};

//delete an existing transaction from the Firebase DB
export const deleteTransaction = async (userId, transactionId) => {
  const transactionRef = doc(db, "users", userId, "transactions", transactionId);
  await deleteDoc(transactionRef);
}; 