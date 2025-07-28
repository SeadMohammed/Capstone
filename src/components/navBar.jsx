import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/authHelpers.js';
import { useNavigate } from 'react-router-dom';

export default function NavBar() {
  const { currentUser } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="NavBar">
      <div className="NavHeader">
        <div className="NavLogo">
          <div className="LogoIcon">💰</div>
          <h1>ClarityAI</h1>
        </div>
      </div>

      <div className="NavRoutes">
        <Link 
          to="/home" 
          className={`NavLink ${isActive('/home') ? 'active' : ''}`}
        >
          <span className="NavIcon">🏠</span>
          Home
        </Link>
        <Link 
          to="/transactions" 
          className={`NavLink ${isActive('/transactions') ? 'active' : ''}`}
        >
          <span className="NavIcon">💳</span>
          Transactions
        </Link>
        <Link 
          to="/goals" 
          className={`NavLink ${isActive('/goals') ? 'active' : ''}`}
        >
          <span className="NavIcon">🎯</span>
          Goals
        </Link>
      </div>

      <div className="NavAuth">
        {currentUser ? (
          <div className="UserInfo">
            <div className="UserAvatar">
              {currentUser.email.charAt(0).toUpperCase()}
            </div>
            <div className="UserDetails">
              <p className="UserEmail">{currentUser.email}</p>
              <button 
                className="SignOutBtn" 
                onClick={() => nav('/signout')}
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <button 
            className="LoginBtn" 
            onClick={() => nav('/login')}
          >
            Login or Signup
          </button>
        )}
      </div>
    </nav>
  );
}
