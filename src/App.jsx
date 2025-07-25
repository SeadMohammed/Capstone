import { Routes, Route, Navigate } from 'react-router-dom';

import NavBar from './components/navBar.jsx';
import Home from './pages/home.jsx';
import Transactions from './pages/transactions.jsx';
import Goals from './pages/goals.jsx'
import Login from './pages/login.jsx';
import SignUp from './pages/signup.jsx';
import SignOut from './pages/signout.jsx';
import './components/geminiBar.jsx'; 
import Gemini from './components/geminiWindow.jsx'

export default function App() {

  return (
    <div className="App">
      <NavBar />
      <div className="AppContent">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signout" element={<SignOut />} />
        </Routes>
      </div>
      <Gemini />
    </div>
  );
}
