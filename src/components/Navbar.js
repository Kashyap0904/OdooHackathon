import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FaUser, FaSignOutAlt, FaCog } from "react-icons/fa";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            Skill Swap Platform
          </Link>

          <ul className="navbar-nav">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/users">Browse Users</Link>
            </li>

            {user ? (
              <>
                <li>
                  <Link to="/skills">My Skills</Link>
                </li>
                <li>
                  <Link to="/swaps">Swaps</Link>
                </li>
                <li>
                  <Link to="/tracking">Tracking</Link>
                </li>
                {user.is_admin && (
                  <li>
                    <Link to="/admin">Admin Panel</Link>
                  </li>
                )}
                <li>
                  <Link to="/profile">
                    <FaUser /> Profile
                  </Link>
                </li>
                <li>
                  <button onClick={handleLogout} className="btn btn-secondary">
                    <FaSignOutAlt /> Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login">Login</Link>
                </li>
                <li>
                  <Link to="/register">Register</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
