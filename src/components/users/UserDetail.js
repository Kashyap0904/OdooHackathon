import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import "./UserDetail.css";

const UserDetail = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [mySkills, setMySkills] = useState([]);
  const [selectedMySkill, setSelectedMySkill] = useState("");
  const [selectedTheirSkill, setSelectedTheirSkill] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/users/${id}`);
      setProfile(res.data);
    } catch (err) {
      toast.error("User not found or not public");
    } finally {
      setLoading(false);
    }
  };

  const openModal = async () => {
    if (!currentUser) {
      toast.info("Please login to request a swap.");
      return;
    }
    // Fetch my offered skills
    try {
      const res = await axios.get("/api/profile");
      setMySkills(res.data.skills_offered || []);
      setSelectedMySkill("");
      setSelectedTheirSkill("");
      setMessage("");
      setShowModal(true);
    } catch (err) {
      toast.error("Failed to load your skills");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMySkill || !selectedTheirSkill) {
      toast.error("Please select both skills.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post("/api/swaps", {
        recipient_id: profile.id,
        requester_skill_id: selectedMySkill,
        recipient_skill_id: selectedTheirSkill,
        message,
      });
      toast.success("Swap request sent!");
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="user-detail-card">Loading...</div>;
  if (!profile)
    return (
      <div className="user-detail-card">User not found or not public.</div>
    );

  const isOwnProfile =
    currentUser && Number(currentUser.id) === Number(profile.id);

  return (
    <div className="user-detail-card">
      <div className="user-detail-header">
        {profile.profile_photo ? (
          <img
            src={profile.profile_photo}
            alt={profile.name}
            className="user-detail-avatar"
          />
        ) : (
          <div className="user-detail-avatar">?</div>
        )}
        <div className="user-detail-info">
          <h2>{profile.name}</h2>
          <div className="user-detail-username">@{profile.username}</div>
          {profile.location && (
            <div className="user-detail-location">{profile.location}</div>
          )}
          {profile.availability && (
            <div className="user-detail-availability">
              <strong>Available:</strong> {profile.availability}
            </div>
          )}
        </div>
      </div>
      <div className="user-detail-section">
        <strong>Skills Offered:</strong>
        {profile.skills_offered && profile.skills_offered.length > 0 ? (
          profile.skills_offered.map((s) => (
            <span key={s.id} className="user-detail-skill-chip">
              {s.name}
            </span>
          ))
        ) : (
          <span style={{ color: "#aaa" }}> None</span>
        )}
      </div>
      <div className="user-detail-section">
        <strong>Skills Wanted:</strong>
        {profile.skills_wanted && profile.skills_wanted.length > 0 ? (
          profile.skills_wanted.map((s) => (
            <span key={s.id} className="user-detail-skill-chip wanted">
              {s.name}
            </span>
          ))
        ) : (
          <span style={{ color: "#aaa" }}> None</span>
        )}
      </div>
      <div className="user-detail-section user-detail-rating">
        <strong>Rating:</strong>{" "}
        {profile.rating ? `${profile.rating}/5` : "N/A"}
      </div>
      {!isOwnProfile && (
        <div className="user-detail-actions">
          <button className="btn btn-success" onClick={openModal}>
            Request
          </button>
        </div>
      )}
      {showModal && (
        <div className="swap-modal-overlay">
          <div className="swap-modal">
            <h3>Send Swap Request</h3>
            <form onSubmit={handleSubmit}>
              <div className="swap-modal-field">
                <label>Your Skill to Offer:</label>
                <select
                  value={selectedMySkill}
                  onChange={(e) => setSelectedMySkill(e.target.value)}
                  required
                >
                  <option value="">Select...</option>
                  {mySkills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="swap-modal-field">
                <label>Their Skill You Want:</label>
                <select
                  value={selectedTheirSkill}
                  onChange={(e) => setSelectedTheirSkill(e.target.value)}
                  required
                >
                  <option value="">Select...</option>
                  {profile.skills_wanted &&
                    profile.skills_wanted.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="swap-modal-field">
                <label>Message:</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Write a message..."
                />
              </div>
              <div className="swap-modal-actions">
                <button
                  className="btn btn-success"
                  type="submit"
                  disabled={submitting}
                >
                  Submit
                </button>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetail;
