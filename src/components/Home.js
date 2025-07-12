import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FaExchangeAlt, FaUsers, FaStar, FaShieldAlt } from "react-icons/fa";

const Home = () => {
  const { user } = useAuth();

  return (
    <div>
      <div
        className="card"
        style={{ textAlign: "center", padding: "40px 20px" }}
      >
        <h1
          style={{ fontSize: "2.5rem", marginBottom: "20px", color: "#007bff" }}
        >
          Welcome to Skill Swap Platform
        </h1>
        <p style={{ fontSize: "1.2rem", marginBottom: "30px", color: "#666" }}>
          Exchange your skills with others and learn something new!
        </p>

        {!user ? (
          <div
            style={{
              display: "flex",
              gap: "20px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/register"
              className="btn btn-primary"
              style={{ fontSize: "1.1rem", padding: "15px 30px" }}
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="btn btn-secondary"
              style={{ fontSize: "1.1rem", padding: "15px 30px" }}
            >
              Login
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "20px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/users"
              className="btn btn-primary"
              style={{ fontSize: "1.1rem", padding: "15px 30px" }}
            >
              Browse Users
            </Link>
            <Link
              to="/skills"
              className="btn btn-success"
              style={{ fontSize: "1.1rem", padding: "15px 30px" }}
            >
              Manage Skills
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-3" style={{ marginTop: "40px" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <FaExchangeAlt
            style={{ fontSize: "3rem", color: "#007bff", marginBottom: "20px" }}
          />
          <h3>Skill Exchange</h3>
          <p>
            Offer your expertise and request skills you want to learn from
            others in the community.
          </p>
        </div>

        <div className="card" style={{ textAlign: "center" }}>
          <FaUsers
            style={{ fontSize: "3rem", color: "#28a745", marginBottom: "20px" }}
          />
          <h3>Connect</h3>
          <p>
            Find people with the skills you need and connect with them for
            mutual learning opportunities.
          </p>
        </div>

        <div className="card" style={{ textAlign: "center" }}>
          <FaStar
            style={{ fontSize: "3rem", color: "#ffc107", marginBottom: "20px" }}
          />
          <h3>Rate & Review</h3>
          <p>
            Share feedback after skill exchanges to help build a trusted
            community of learners.
          </p>
        </div>
      </div>

      {user && (
        <div className="card" style={{ marginTop: "40px" }}>
          <h2>Quick Actions</h2>
          <div className="grid grid-2">
            <div>
              <h4>Your Profile</h4>
              <p>Update your skills, availability, and profile information.</p>
              <Link to="/profile" className="btn btn-primary">
                Edit Profile
              </Link>
            </div>
            <div>
              <h4>Active Swaps</h4>
              <p>View and manage your current swap requests and agreements.</p>
              <Link to="/swaps" className="btn btn-success">
                View Swaps
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
