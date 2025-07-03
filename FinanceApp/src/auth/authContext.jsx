import {
    createContext,
    useContext,
    useEffect,
    useState,
    useMemo,
  } from "react";
import { auth } from "./firebaseConfig.js";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, updateProfile} from "firebase/auth";
import { AuthContext } from "./authHelpers.js";

//const AuthContext = createContext();
  
export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    function login(email, password) {
        return signInWithEmailAndPassword(auth,email,password);
    }

    async function signup(username, email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await updateProfile(user, 
                { displayName: username});

            return userCredential;

        } catch(err) {
            throw err;
        }

    }
    
    function logout() {
        return signOut(auth)
    }
  
   
    const value = useMemo(
      () => ({ currentUser, loading, logout, login, signup}),
      [currentUser, loading]
    );
  
   
    //REFRESH SCREEN
    if (loading) {
      return <div>Loading authentication...</div>;
    }
  
    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    );
  }
