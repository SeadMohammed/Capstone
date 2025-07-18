import { db } from "../auth/firebaseConfig";
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy 
} from 'firebase/firestore';


// Get all budgets for a user
export const getBudgets = async (userId) => {
    try {
        const budgetsRef = collection(db, 'users', userId, 'budgets');
        const budgetsQuery = query(budgetsRef, orderBy('name'));
        const querySnapshot = await getDocs(budgetsQuery);
        
        const budgets = [];
        querySnapshot.forEach((doc) => {
            budgets.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return budgets;
    } catch (error) {
        console.error('Error fetching budgets:', error);
        throw error;
    }
};

// Save a single budget
export const saveBudget = async (userId, budgetData) => {
    try {
        const budgetRef = doc(db, 'users', userId, 'budgets', budgetData.id);
        await setDoc(budgetRef, {
            name: budgetData.name,
            emoji: budgetData.emoji,
            color: budgetData.color,
            budgetAmount: budgetData.budgetAmount,
            spentAmount: budgetData.spentAmount || 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error saving budget:', error);
        throw error;
    }
};

// Save multiple budgets (for initial setup)
export const saveBudgets = async (userId, budgetsArray) => {
    try {
        const promises = budgetsArray.map(budget => saveBudget(userId, budget));
        await Promise.all(promises);
        return { success: true };
    } catch (error) {
        console.error('Error saving budgets:', error);
        throw error;
    }
};

// Update a specific budget
export const updateBudget = async (userId, budgetId, updates) => {
    try {
        const budgetRef = doc(db, 'users', userId, 'budgets', budgetId);
        await updateDoc(budgetRef, {
            ...updates,
            updatedAt: new Date()
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error updating budget:', error);
        throw error;
    }
};

// Delete a budget
export const deleteBudget = async (userId, budgetId) => {
    try {
        const budgetRef = doc(db, 'users', userId, 'budgets', budgetId);
        await deleteDoc(budgetRef);
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting budget:', error);
        throw error;
    }
};

// Update spent amount for a budget (for when transactions are added)
export const updateBudgetSpentAmount = async (userId, budgetId, newSpentAmount) => {
    try {
        const budgetRef = doc(db, 'users', userId, 'budgets', budgetId);
        await updateDoc(budgetRef, {
            spentAmount: newSpentAmount,
            updatedAt: new Date()
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error updating budget spent amount:', error);
        throw error;
    }
};

// Check if user has any budgets
export const userHasBudgets = async (userId) => {
    try {
        const budgetsRef = collection(db, 'users', userId, 'budgets');
        const querySnapshot = await getDocs(budgetsRef);
        
        return !querySnapshot.empty;
    } catch (error) {
        console.error('Error checking user budgets:', error);
        return false;
    }
};
