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
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchRatings();
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

  const fetchRatings = async () => {
    try {
      const res = await axios.get(`/api/users/${id}/ratings`);
      setRatings(res.data);
    } catch (err) {
      setRatings([]);
    }
  };

  // Compute intersection for swap by skill id (now that IDs are consistent)
  const theirWantedSkillIds = (profile?.skills_wanted || []).map((s) => s.id);
  const theirOfferedSkillIds = (profile?.skills_offered || []).map((s) => s.id);
  const myOfferedIntersection = mySkills.filter((s) =>
    theirWantedSkillIds.includes(s.id)
  );
  const myWantedSkills = profile?.skills_wanted || [];
  // For their offered, we need to fetch my wanted skills (not available in this component), so let's fetch them in openModal
  const [myWanted, setMyWanted] = useState([]);

  // In openModal, fetch my wanted skills as well
  const openModal = async () => {
    if (!currentUser) {
      toast.info("Please login to request a swap.");
      return;
    }
    try {
      const res = await axios.get("/api/profile");
      setMySkills(res.data.skills_offered || []);
      setMyWanted(res.data.skills_wanted || []);
      setSelectedMySkill("");
      setSelectedTheirSkill("");
      setMessage("");
      setShowModal(true);
    } catch (err) {
      toast.error("Failed to load your skills");
    }
  };

  // Compute intersection for their offered skills and my wanted skills by id
  const myWantedSkillIds = myWanted.map((s) => s.id);
  const theirOfferedIntersection = (profile?.skills_offered || []).filter((s) =>
    myWantedSkillIds.includes(s.id)
  );

  // Allow swap if at least one skill matches in both directions
  const noSwapPossible =
    myOfferedIntersection.length === 0 || theirOfferedIntersection.length === 0;

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

  // Debug logs to check skill arrays and intersections
  console.log("mySkills:", mySkills);
  console.log("myWanted:", myWanted);
  console.log("profile.skills_offered:", profile?.skills_offered);
  console.log("profile.skills_wanted:", profile?.skills_wanted);
  console.log("myOfferedIntersection:", myOfferedIntersection);
  console.log("theirOfferedIntersection:", theirOfferedIntersection);

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
        {profile?.skills_offered && profile.skills_offered.length > 0 ? (
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
        {profile?.skills_wanted && profile.skills_wanted.length > 0 ? (
          profile.skills_wanted.map((s) => (
            <span key={s.id} className="user-detail-skill-chip wanted">
              {s.name}
            </span>
          ))
        ) : (
          <span style={{ color: "#aaa" }}> None</span>
        )}
      </div>
      <div className="user-detail-section user-detail-rating" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <strong>Rating:</strong>{" "}
          {profile.rating ? `${profile.rating}/5` : "N/A"}
        </div>
        {!isOwnProfile && (
          <div className="user-detail-actions" style={{ margin: 0 }}>
            <button className="btn btn-success" onClick={openModal}>
              Request
            </button>
          </div>
        )}
      </div>
      {ratings.length > 0 && (
        <div className="user-detail-section user-detail-feedback">
          <h4>Feedback & Reviews</h4>
          {ratings.map((r) => (
            <div key={r.id} className="user-feedback-card">
              <div className="user-feedback-header">
                {r.rater_photo ? (
                  <img
                    src={r.rater_photo}
                    alt={r.rater_name}
                    className="user-feedback-avatar"
                  />
                ) : (
                  <div className="user-feedback-avatar">?</div>
                )}
                <div className="user-feedback-info">
                  <div className="user-feedback-name">{r.rater_name}</div>
                  <div className="user-feedback-rating">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span
                        key={i}
                        className={i < r.rating ? "star filled" : "star"}
                      >
                        ★
                      </span>
                    ))}
                    <span className="user-feedback-date">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              {r.feedback && (
                <div className="user-feedback-text">{r.feedback}</div>
              )}
            </div>
          ))}
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
                  disabled={noSwapPossible}
                >
                  <option value="">Select...</option>
                  {myOfferedIntersection.map((s) => (
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
                  disabled={noSwapPossible}
                >
                  <option value="">Select...</option>
                  {theirOfferedIntersection.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {noSwapPossible && (
                <div style={{ color: "#d32f2f", marginBottom: 10 }}>
                  You and this user do not have matching skills to swap.
                </div>
              )}
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
                  disabled={submitting || noSwapPossible}
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
