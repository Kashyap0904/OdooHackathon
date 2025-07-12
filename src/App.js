import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Home from './components/Home';
import Profile from './components/profile/Profile';
import UserList from './components/users/UserList';
import UserDetail from './components/users/UserDetail';
import Skills from './components/skills/Skills';
import Swaps from './components/swaps/Swaps';
import AdminPanel from './components/admin/AdminPanel';
import LoadingSpinner from './components/common/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="App">
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/users" element={<UserList />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/skills" element={user ? <Skills /> : <Navigate to="/login" />} />
          <Route path="/swaps" element={user ? <Swaps /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user?.is_admin ? <AdminPanel /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App; 