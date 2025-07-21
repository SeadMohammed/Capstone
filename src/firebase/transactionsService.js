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
  // Temporarily remove ordering to handle missing createdAt fields
  const snapshot = await getDocs(transactionsRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      // Sort by date if createdAt is missing
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toDate() - a.createdAt.toDate();
      }
      return new Date(b.date) - new Date(a.date);
    });
};

//add a transaction to Firestore DB
export const addTransaction = async (userId, description, amount, type, category, date, recurring = 'none', isRecurring = false, recurringSeriesId = null) => {
  const transactionsRef = collection(db, "users", userId, "transactions");
  await addDoc(transactionsRef, {
    description,
    amount: parseFloat(amount),
    type, // 'income' or 'expense'
    category,
    date,
    recurring, // 'none', 'weekly', 'monthly', 'annually'
    isRecurring, // boolean to identify if this is a generated recurring transaction
    recurringSeriesId, // unique ID to group recurring transactions together
    createdAt: serverTimestamp(),
  });
};

//update existing transaction in firebase DB
export const updateTransaction = async (userId, transactionId, data) => {
  const transactionRef = doc(db, "users", userId, "transactions", transactionId);
  await updateDoc(transactionRef, {
    ...data,
    amount: parseFloat(data.amount)
  });
};

//delete an existing transaction from the Firebase DB
export const deleteTransaction = async (userId, transactionId) => {
  const transactionRef = doc(db, "users", userId, "transactions", transactionId);
  await deleteDoc(transactionRef);
}; 