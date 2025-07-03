import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "financial-application-ddfa0.firebaseapp.com",
    projectId: "financial-application-ddfa0",
    storageBucket: "financial-application-ddfa0.firebasestorage.app",
    messagingSenderId: "1098019314225",
    appId: "1:1098019314225:web:bb528598b5ae2d6bb71310",
    measurementId: "G-WTMZLXTS0X",
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
