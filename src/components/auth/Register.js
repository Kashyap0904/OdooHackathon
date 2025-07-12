import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import {
  FaUserPlus,
  FaUser,
  FaEnvelope,
  FaLock,
  FaMapMarkerAlt,
  FaClock,
} from "react-icons/fa";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    location: "",
    availability: "",
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    const { confirmPassword, ...registerData } = formData;
    const result = await register(registerData);

    if (result.success) {
      toast.success("Registration successful! Please login.");
      navigate("/login");
    } else {
      toast.error(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="card" style={{ maxWidth: "500px", margin: "50px auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
        <FaUserPlus /> Register
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">
            <FaUser /> Username *
          </label>
          <input
            type="text"
            id="username"
            name="username"
            className="form-control"
            value={formData.username}
            onChange={handleChange}
            required
            minLength={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">
            <FaEnvelope /> Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className="form-control"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="name">
            <FaUser /> Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className="form-control"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">
            <FaLock /> Password *
          </label>
          <input
            type="password"
            id="password"
            name="password"
            className="form-control"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">
            <FaLock /> Confirm Password *
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            className="form-control"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">
            <FaMapMarkerAlt /> Location (optional)
          </label>
          <input
            type="text"
            id="location"
            name="location"
            className="form-control"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., New York, NY"
          />
        </div>

        <div className="form-group">
          <label htmlFor="availability">
            <FaClock /> Availability (optional)
          </label>
          <textarea
            id="availability"
            name="availability"
            className="form-control"
            value={formData.availability}
            onChange={handleChange}
            placeholder="e.g., Weekends, Evenings after 6 PM"
            rows="3"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%" }}
          disabled={loading}
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: "20px" }}>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
};

export default Register;
