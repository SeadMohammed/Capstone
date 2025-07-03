// src/SignOut.jsx
import { useAuth } from '../auth/authHelpers.js';
import { useNavigate } from 'react-router-dom';

export default function SignOut() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleConfirm = async () => {
    try { 
        await logout();
        navigate('/home', { replace: true });
    } catch(err) {
        console.log(err);
    }
  };

  const handleCancel = () => {
    navigate(-1); 
  };

  return (
    <div className="SignOut" onClick={handleCancel}>
      <div className="SOContent" onClick={e => e.stopPropagation()}>
        <h3>Confirm Sign‑Out</h3>
        <p>Are you sure you want to sign out?</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
          <button 
            onClick={handleConfirm}
            className="SOConfirm"
          >
            Yes, Sign Out
          </button>
          <button 
            onClick={handleCancel}
            className="SOCancel"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
