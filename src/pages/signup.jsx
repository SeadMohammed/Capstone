

import { useAuth } from '../auth/authHelpers';
import { signInWithPhoneNumber, signInWithPopup } from 'firebase/auth';
import { useState, useRef , useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../auth/firebaseConfig';

export default function SignUp({ onClose }) {
    
    //Form References
    const signRef = useRef();

    //User Info
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');  
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const {signup, currentUser} = useAuth();

    const navigate = useNavigate();

    //Set focus to username form
    useEffect(() => {
        signRef.current.focus();
    },[])
    
    //Refresh error text
    useEffect(() => {
        setError('')
    },[email, username, password])

    const closeModal = () => {
        if (onClose) {
            onClose();
        } else {
            navigate(-1);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            await signup(username,email,password);
            closeModal();
        } catch (err) {
            setError(err.message || 'Failed to signup');
            console.error(err);
        } finally {
          setLoading(false)
        }
    };

  const handleGoogleSignUp = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithPopup(auth, googleProvider)
      closeModal();
    } catch (err) {
      setError(err.message || "Failed to signup with Google");
      console.error(err);
    } finally {
      setLoading(false)
    }
  };

  return (
    <div className="Login" onClick={closeModal}>
      <div className="LoginContent" onClick={e => e.stopPropagation()}>
        <button className="LoginClose" onClick={closeModal}>×</button>

        <h2>Sign Up</h2>

        <form onSubmit={handleSignUp}>
          <input
            type="text"
            placeholder="Username"
            ref = {signRef}
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="email"
            placeholder="Email"
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
          <button type="submit">
            Sign Up
          </button>
        </form>

        <button className="GoogleBtn" onClick={handleGoogleSignUp}>
          Sign up with Google
        </button>

        <p className="FooterText">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            disabled={loading}
          >
            Log In
          </button>
        </p>
      </div>
    </div>
  );
}
