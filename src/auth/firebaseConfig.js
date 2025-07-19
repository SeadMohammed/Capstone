import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "clarityai-8d562.firebaseapp.com",
    projectId: "clarityai-8d562",
    storageBucket: "clarityai-8d562.firebasestorage.app",
    messagingSenderId: "315016782530",
    appId: "1:315016782530:web:28efb99e340e9d550b115b",
    measurementId: "G-B815V2N3SS"
};


const app = initializeApp(firebaseConfig);

//set the database variable to get the exsisting database from firestore
const db = getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { db };