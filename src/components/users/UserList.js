import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FaSearch, FaUser, FaMapMarkerAlt } from "react-icons/fa";
import LoadingSpinner from "../common/LoadingSpinner";
import { useAuth } from "../../contexts/AuthContext";

const AVAILABILITY_OPTIONS = [
  "Any",
  "Weekdays",
  "Weekends",
  "Evenings",
  "Mornings",
  "Afternoons",
];

const USERS_PER_PAGE = 6;

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [availability, setAvailability] = useState("Any");
  const [currentPage, setCurrentPage] = useState(1);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (skill = "", avail = "Any") => {
    try {
      let query = [];
      if (skill) query.push(`skill=${encodeURIComponent(skill)}`);
      if (avail && avail !== "Any")
        query.push(`availability=${encodeURIComponent(avail)}`);
      const queryString = query.length ? `?${query.join("&")}` : "";
      const response = await axios.get(`/api/users${queryString}`);
      setUsers(response.data);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(searchTerm, availability);
  };

  if (loading) return <LoadingSpinner />;

  // Filter out the logged-in user and any admin users
  const filteredUsers = users.filter(
    (u) => u.id !== currentUser?.id && !u.is_admin
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  return (
    <div>
      <div className="card">
        <h2>Browse Users</h2>
        <p>Find people with skills you want to learn from</p>

        <form onSubmit={handleSearch} style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="form-control"
              style={{ maxWidth: "180px" }}
            >
              {AVAILABILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search by skill (e.g., Photoshop, Excel, Cooking)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">
              <FaSearch /> Search
            </button>
          </div>
        </form>

        {(searchTerm || availability !== "Any") && (
          <button
            onClick={() => {
              setSearchTerm("");
              setAvailability("Any");
              fetchUsers();
            }}
            className="btn btn-secondary"
            style={{ marginBottom: "20px" }}
          >
            Clear Search
          </button>
        )}
      </div>

      <div className="grid grid-2">
        {paginatedUsers.map((user) => (
          <div
            key={user.id}
            className="card user-card-hover"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              minWidth: 0,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              {user.profile_photo ? (
                <img
                  src={user.profile_photo}
                  alt={user.name}
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    marginRight: "15px",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    backgroundColor: "#007bff",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.7rem",
                    marginRight: "15px",
                  }}
                >
                  <FaUser />
                </div>
              )}
              <div>
                <h3>{user.name}</h3>
                <p style={{ color: "#666", margin: 0 }}>@{user.username}</p>
              </div>
            </div>

            {user.location && (
              <p style={{ marginBottom: "10px" }}>
                <FaMapMarkerAlt style={{ marginRight: "5px" }} />
                {user.location}
              </p>
            )}

            {user.availability && (
              <p
                style={{
                  marginBottom: "10px",
                  fontSize: "0.9rem",
                  color: "#666",
                }}
              >
                <strong>Available:</strong> {user.availability}
              </p>
            )}

            {/* Skills Offered */}
            {user.skills_offered && user.skills_offered.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <span style={{ fontWeight: 600, color: "#28a745" }}>
                  Skills Offered:
                </span>
                {user.skills_offered.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      display: "inline-block",
                      background: "#e6f4ea",
                      color: "#28a745",
                      borderRadius: "12px",
                      padding: "2px 10px",
                      margin: "0 5px 5px 0",
                      fontSize: "0.85rem",
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Skills Wanted */}
            {user.skills_wanted && user.skills_wanted.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <span style={{ fontWeight: 600, color: "#007bff" }}>
                  Skills Wanted:
                </span>
                {user.skills_wanted.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      display: "inline-block",
                      background: "#e6f0fa",
                      color: "#007bff",
                      borderRadius: "12px",
                      padding: "2px 10px",
                      margin: "0 5px 5px 0",
                      fontSize: "0.85rem",
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* User Rating */}
            <div
              style={{
                marginBottom: "10px",
                color: "#ffc107",
                fontWeight: 600,
              }}
            >
              Rating: {user.rating ? `${user.rating}/5` : "N/A"}
            </div>

            {/* Button Group for actions */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <Link
                to={`/users/${user.id}`}
                className="btn btn-primary"
                style={{ marginRight: "10px", marginBottom: "8px" }}
              >
                View Profile
              </Link>
              {/* Add more buttons here if needed */}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "30px 0",
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ marginRight: "10px" }}
          >
            &lt;
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`btn ${
                page === currentPage ? "btn-primary" : "btn-light"
              }`}
              onClick={() => setCurrentPage(page)}
              style={{ margin: "0 3px" }}
            >
              {page}
            </button>
          ))}
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ marginLeft: "10px" }}
          >
            &gt;
          </button>
        </div>
      )}
      {users.length === 0 && !loading && (
        <div className="card" style={{ textAlign: "center" }}>
          <p>No users found. Try adjusting your search terms.</p>
        </div>
      )}
    </div>
  );
};

export default UserList;
