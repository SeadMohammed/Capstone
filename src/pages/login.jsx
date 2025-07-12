/*src/pages/login.jsx*/

// Login Pop-Up


import { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/authHelpers';
import { auth, googleProvider } from '../auth/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';

//Login Pop-Up Component
export default function Login({ onClose }) {
    
    //References to form fields
    const userRef = useRef();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');   
    const [error, setError] = useState('');
    
    const [loading, setLoading] = useState(false);
    const { login, currentUser } = useAuth();
    

    //Navigate
    const navigate = useNavigate();

    //Set focus so that you start in the email box 
    useEffect(() => {
        userRef.current.focus();
    },[])

    //Clear Error messages
    useEffect(() => {
        setError('')
    },[email,password])

    //Once closed, continue or nav backwards
    const closeModal = () => {
        if (onClose) {
            onClose();
        } else {
            navigate(-1);
        }
    };

    //Submit Handler
    const handleEmailPass = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            await login(email, password);
            closeModal();
        } catch (err) {
            // 5/30 TODO: Improve Error Handling (specific errors, etc.)
            // Firebase has specific errors
            setError(err.message || 'Failed to Login.');
            console.error(err);
        } finally{
          setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setError('');
            setLoading(true);
            await signInWithPopup(auth,googleProvider);
            closeModal();
        } catch (err) {
            // 5/30 TODO: Improve Error Handling (specific errors, etc.)
            setError(err.message || 'Failed to Login with Google.')
            console.error(err);
        } finally {
          setLoading(false);
        }
    };

    //Can check if logged in here if needed

  return (
    <div className="Login" onClick={closeModal}>
      <div className="LoginContent" onClick={e => e.stopPropagation()}>
        <button className="LoginClose" onClick={closeModal}>×</button>
        <h2>Log In</h2>

        <form onSubmit={handleEmailPass}>
          <input
            type="email"
            placeholder="Email"
            ref = {userRef}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            Log In
          </button>
        </form>

        <button className="GoogleBtn" onClick={handleGoogleSignIn}>
          Continue with Google
        </button>

        <p className="FooterText">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/signup', { replace: true })}
            disabled={loading}
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
