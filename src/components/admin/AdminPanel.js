import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./AdminPanel.css";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [pendingSkills, setPendingSkills] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, skillsRes, statsRes] = await Promise.all([
        axios.get("/api/admin/users"),
        axios.get("/api/admin/skills/pending"),
        axios.get("/api/admin/stats"),
      ]);
      setUsers(usersRes.data);
      setPendingSkills(skillsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId, isBanned) => {
    setActionLoading(true);
    try {
      await axios.patch(`/api/admin/users/${userId}`, {
        is_banned: !isBanned,
      });
      toast.success(`User ${isBanned ? "unbanned" : "banned"} successfully`);
      fetchData();
    } catch (err) {
      toast.error("Failed to update user status");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteUser = async (userId, isAdmin) => {
    setActionLoading(true);
    try {
      await axios.patch(`/api/admin/users/${userId}`, {
        is_admin: !isAdmin,
      });
      toast.success(`User ${isAdmin ? "demoted" : "promoted"} successfully`);
      fetchData();
    } catch (err) {
      toast.error("Failed to update user role");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveSkill = async (skillId, isApproved) => {
    setActionLoading(true);
    try {
      await axios.patch(`/api/admin/skills/${skillId}`, {
        is_approved: isApproved,
      });
      toast.success(
        `Skill ${isApproved ? "approved" : "rejected"} successfully`
      );
      fetchData();
    } catch (err) {
      toast.error("Failed to update skill status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadReport = async (type) => {
    try {
      const res = await axios.get(`/api/admin/reports/${type}?format=csv`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${type}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Failed to download report");
    }
  };

  const handleDownloadUserReport = async (userId, type) => {
    try {
      const res = await axios.get(
        `/api/admin/reports/${type}?format=csv&user_id=${userId}`,
        {
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${type}_user_${userId}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Failed to download user report");
    }
  };

  if (loading) return <div className="admin-panel">Loading...</div>;

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>

      <div className="admin-tabs">
        <button
          className={`tab ${activeTab === "stats" ? "active" : ""}`}
          onClick={() => setActiveTab("stats")}
        >
          Statistics
        </button>
        <button
          className={`tab ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Users ({users.length})
        </button>
        <button
          className={`tab ${activeTab === "skills" ? "active" : ""}`}
          onClick={() => setActiveTab("skills")}
        >
          Pending Skills ({pendingSkills.length})
        </button>
      </div>

      <div className="admin-content">
        {activeTab === "users" && (
          <div className="users-section">
            <h3>User Management</h3>
            <div className="users-grid">
              {users
                .filter((user) => !user.is_admin)
                .map((user) => (
                  <div key={user.id} className="user-card">
                    <div className="user-info">
                      <img
                        src={user.profile_photo || "/default-avatar.png"}
                        alt={user.name}
                        className="user-avatar"
                      />
                      <div>
                        <h4>{user.name}</h4>
                        <p>@{user.username}</p>
                        <p>{user.email}</p>
                        <p>
                          Joined:{" "}
                          {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="user-stats">
                      <span>
                        Skills Offered: {user.skills_offered?.length || 0}
                      </span>
                      <span>
                        Skills Wanted: {user.skills_wanted?.length || 0}
                      </span>
                    </div>
                    {/* <div className="user-actions">
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 8, margin: '10px 0 8px 0' }}>
                        <button
                          className="btn btn-light"
                          onClick={() => handleDownloadUserReport(user.id, "users")}
                        >
                          Activity (CSV)
                        </button>
                        <button
                          className="btn btn-light"
                          onClick={() => handleDownloadUserReport(user.id, "feedback")}
                        >
                          Feedback (CSV)
                        </button>
                        <button
                          className="btn btn-light"
                          onClick={() => handleDownloadUserReport(user.id, "swaps")}
                        >
                          Swaps (CSV)
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 12, marginBottom: 6 }}>
                        <button
                          className={`btn ${user.is_banned ? "btn-success" : "btn-danger"}`}
                          onClick={() => handleBanUser(user.id, user.is_banned)}
                          disabled={actionLoading}
                        >
                          {user.is_banned ? "Unban" : "Ban"}
                        </button>
                        <button
                          className={`btn ${user.is_admin ? "btn-warning" : "btn-primary"}`}
                          onClick={() => handlePromoteUser(user.id, user.is_admin)}
                          disabled={actionLoading}
                        >
                          {user.is_admin ? "Remove Admin" : "Make Admin"}
                        </button>
                      </div>
                    </div> */}
                    <div className="user-actions">
                      {/* Row 1: Activity, Feedback, Swaps */}
                      <div className="row">
                        <button
                          className="btn btn-light"
                          onClick={() =>
                            handleDownloadUserReport(user.id, "users")
                          }
                        >
                          Activity (CSV)
                        </button>
                        <button
                          className="btn btn-light"
                          onClick={() =>
                            handleDownloadUserReport(user.id, "feedback")
                          }
                        >
                          Feedback (CSV)
                        </button>
                        <button
                          className="btn btn-light"
                          onClick={() =>
                            handleDownloadUserReport(user.id, "swaps")
                          }
                        >
                          Swaps (CSV)
                        </button>
                      </div>

                      {/* Row 2: Ban / Admin */}
                      <div className="row">
                        <button
                          className={`btn ${
                            user.is_banned ? "btn-success" : "btn-danger"
                          }`}
                          onClick={() => handleBanUser(user.id, user.is_banned)}
                          disabled={actionLoading}
                        >
                          {user.is_banned ? "Unban" : "Ban"}
                        </button>
                        <button
                          className={`btn ${
                            user.is_admin ? "btn-warning" : "btn-primary"
                          }`}
                          onClick={() =>
                            handlePromoteUser(user.id, user.is_admin)
                          }
                          disabled={actionLoading}
                        >
                          {user.is_admin ? "Remove Admin" : "Make Admin"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === "skills" && (
          <div className="skills-section">
            <h3>Pending Skills</h3>
            {pendingSkills.length === 0 ? (
              <p>No pending skills to review.</p>
            ) : (
              <div className="skills-grid">
                {pendingSkills.map((skill) => (
                  <div key={skill.id} className="skill-card">
                    <div className="skill-info">
                      <h4>{skill.name}</h4>
                      <p>
                        <strong>Category:</strong> {skill.category}
                      </p>
                      <p>
                        <strong>Description:</strong> {skill.description}
                      </p>
                      <p>
                        <strong>Submitted:</strong>{" "}
                        {new Date(skill.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="skill-actions">
                      <button
                        className="btn btn-success"
                        onClick={() => handleApproveSkill(skill.id, true)}
                        disabled={actionLoading}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleApproveSkill(skill.id, false)}
                        disabled={actionLoading}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "stats" && (
          <div className="stats-section">
            <h3>Platform Statistics</h3>
            <div style={{ marginBottom: 24 }}>
              <button
                className="btn btn-primary"
                style={{ marginRight: 10 }}
                onClick={() => handleDownloadReport("users")}
              >
                Download User Activity (CSV)
              </button>
              <button
                className="btn btn-primary"
                style={{ marginRight: 10 }}
                onClick={() => handleDownloadReport("feedback")}
              >
                Download Feedback Logs (CSV)
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleDownloadReport("swaps")}
              >
                Download Swap Stats (CSV)
              </button>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Total Users</h4>
                <p className="stat-number">{stats.totalUsers || 0}</p>
              </div>
              <div className="stat-card">
                <h4>Active Users</h4>
                <p className="stat-number">{stats.activeUsers || 0}</p>
              </div>
              <div className="stat-card">
                <h4>Total Skills</h4>
                <p className="stat-number">{stats.totalSkills || 0}</p>
              </div>
              <div className="stat-card">
                <h4>Pending Skills</h4>
                <p className="stat-number">{stats.pendingSkills || 0}</p>
              </div>
              <div className="stat-card">
                <h4>Total Swaps</h4>
                <p className="stat-number">{stats.totalSwaps || 0}</p>
              </div>
              <div className="stat-card">
                <h4>Completed Swaps</h4>
                <p className="stat-number">{stats.completedSwaps || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
