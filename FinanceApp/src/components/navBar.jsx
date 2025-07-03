import { Link } from 'react-router-dom';
import { useAuth } from '../auth/authHelpers.js';

import { useNavigate } from 'react-router-dom';

export default function NavBar() {
  const { currentUser } = useAuth();
  const nav = useNavigate();
  return (
    <nav className="NavBar">
      <div className="NavRoutes">
        <h2>Finance</h2>
        <Link to="/home">Home</Link>
        <Link to="/transactions">Transactions</Link>
        <Link to="/goals">Goals</Link>
      </div>

      <div className="NavAuth">
        {currentUser ? (
          <div className="UserInfo">
            <p>Signed in as <strong>{currentUser.email}</strong></p>
            <button onClick={() => nav('/signout')}>Sign Out</button>
          </div>
        ) : (
          <button onClick={() => nav('/login')}>Login or Signup</button>
        )}
      </div>
    </nav>
    
  );
}

