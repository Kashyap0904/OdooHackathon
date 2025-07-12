import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import "./SwapTracking.css";

const SwapTracking = () => {
  const { user } = useAuth();
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSwap, setSelectedSwap] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [progressData, setProgressData] = useState({
    tracking_status: "",
    notes: "",
    completed: false,
  });
  const [ratingData, setRatingData] = useState({
    rating: 5,
    feedback: "",
  });

  useEffect(() => {
    fetchSwaps();
  }, []);

  const fetchSwaps = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/swaps");
      setSwaps(response.data);
    } catch (err) {
      toast.error("Failed to load swaps");
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = async (e) => {
    e.preventDefault();
    if (!selectedSwap) return;

    try {
      await axios.patch(`/api/swaps/${selectedSwap.id}/progress`, progressData);
      toast.success("Progress updated successfully");
      setShowProgressModal(false);
      setProgressData({ tracking_status: "", notes: "", completed: false });
      fetchSwaps();
    } catch (err) {
      toast.error("Failed to update progress");
    }
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSwap) return;

    const ratedUserId =
      selectedSwap.requester_id === user.id
        ? selectedSwap.recipient_id
        : selectedSwap.requester_id;

    try {
      await axios.post("/api/ratings", {
        swap_id: selectedSwap.id,
        rated_user_id: ratedUserId,
        rating: ratingData.rating,
        feedback: ratingData.feedback,
      });
      toast.success("Rating submitted successfully");
      setShowRatingModal(false);
      setRatingData({ rating: 5, feedback: "" });
      fetchSwaps();
    } catch (err) {
      toast.error("Failed to submit rating");
    }
  };

  const openProgressModal = (swap) => {
    setSelectedSwap(swap);
    setProgressData({
      tracking_status: swap.tracking_status || "in_progress",
      notes:
        swap.requester_id === user.id
          ? swap.requester_notes || ""
          : swap.recipient_notes || "",
      completed:
        swap.requester_id === user.id
          ? swap.requester_completed
          : swap.recipient_completed,
    });
    setShowProgressModal(true);
  };

  const openRatingModal = (swap) => {
    setSelectedSwap(swap);
    setShowRatingModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: "badge-pending", text: "Pending" },
      accepted: { class: "badge-accepted", text: "Accepted" },
      rejected: { class: "badge-rejected", text: "Rejected" },
      cancelled: { class: "badge-cancelled", text: "Cancelled" },
    };
    const config = statusConfig[status] || {
      class: "badge-pending",
      text: status,
    };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const getTrackingBadge = (trackingStatus) => {
    const trackingConfig = {
      pending: { class: "badge-pending", text: "Pending" },
      in_progress: { class: "badge-progress", text: "In Progress" },
      completed: { class: "badge-completed", text: "Completed" },
      half_completed: { class: "badge-half", text: "Half Completed" },
      not_completed: { class: "badge-not-completed", text: "Not Completed" },
    };
    const config = trackingConfig[trackingStatus] || {
      class: "badge-pending",
      text: trackingStatus,
    };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const getOtherUser = (swap) => {
    return swap.requester_id === user.id
      ? {
          name: swap.recipient_name,
          username: swap.recipient_username,
          photo: swap.recipient_photo,
        }
      : {
          name: swap.requester_name,
          username: swap.requester_username,
          photo: swap.requester_photo,
        };
  };

  const getMySkill = (swap) => {
    return swap.requester_id === user.id
      ? { name: swap.requester_skill_name, type: "offering" }
      : { name: swap.recipient_skill_name, type: "receiving" };
  };

  const getOtherSkill = (swap) => {
    return swap.requester_id === user.id
      ? { name: swap.recipient_skill_name, type: "receiving" }
      : { name: swap.requester_skill_name, type: "offering" };
  };

  const canRate = (swap) => {
    return (
      swap.tracking_status === "completed" &&
      swap.status === "accepted" &&
      !swap.hasRated
    ); // You might want to check if user already rated
  };

  if (loading) return <div className="swap-tracking">Loading...</div>;

  return (
    <div className="swap-tracking">
      <h2>Swap Tracking</h2>

      {swaps.length === 0 ? (
        <div className="no-swaps">
          <p>No swaps found. Start by requesting or accepting a skill swap!</p>
        </div>
      ) : (
        <div className="swaps-grid">
          {swaps.map((swap) => {
            const otherUser = getOtherUser(swap);
            const mySkill = getMySkill(swap);
            const otherSkill = getOtherSkill(swap);

            return (
              <div key={swap.id} className="swap-card">
                <div className="swap-header">
                  <div className="user-info">
                    <img
                      src={otherUser.photo || "/default-avatar.png"}
                      alt={otherUser.name}
                      className="user-avatar"
                    />
                    <div>
                      <h4>{otherUser.name}</h4>
                      <p>@{otherUser.username}</p>
                    </div>
                  </div>
                  <div className="swap-status">
                    {getStatusBadge(swap.status)}
                    {swap.status === "accepted" &&
                      getTrackingBadge(swap.tracking_status)}
                  </div>
                </div>

                <div className="swap-details">
                  <div className="skill-exchange">
                    <div className="skill-item">
                      <span className="skill-label">You {mySkill.type}:</span>
                      <span className="skill-name">{mySkill.name}</span>
                    </div>
                    <div className="exchange-arrow">⇄</div>
                    <div className="skill-item">
                      <span className="skill-label">
                        You {otherSkill.type}:
                      </span>
                      <span className="skill-name">{otherSkill.name}</span>
                    </div>
                  </div>

                  {swap.message && (
                    <div className="swap-message">
                      <strong>Message:</strong> {swap.message}
                    </div>
                  )}

                  <div className="swap-dates">
                    <span>
                      Created: {new Date(swap.created_at).toLocaleDateString()}
                    </span>
                    {swap.completed_at && (
                      <span>
                        Completed:{" "}
                        {new Date(swap.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {swap.status === "accepted" && (
                    <div className="progress-info">
                      {swap.requester_notes && (
                        <div className="notes">
                          <strong>Requester Notes:</strong>{" "}
                          {swap.requester_notes}
                        </div>
                      )}
                      {swap.recipient_notes && (
                        <div className="notes">
                          <strong>Recipient Notes:</strong>{" "}
                          {swap.recipient_notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="swap-actions">
                  {swap.status === "accepted" &&
                    swap.tracking_status !== "completed" && (
                      <button
                        className="btn btn-primary"
                        onClick={() => openProgressModal(swap)}
                      >
                        Update Progress
                      </button>
                    )}

                  {canRate(swap) && (
                    <button
                      className="btn btn-success"
                      onClick={() => openRatingModal(swap)}
                    >
                      Rate User
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Update Modal */}
      {showProgressModal && selectedSwap && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Update Swap Progress</h3>
            <form onSubmit={handleProgressUpdate}>
              <div className="form-group">
                <label>Status:</label>
                <select
                  value={progressData.tracking_status}
                  onChange={(e) =>
                    setProgressData({
                      ...progressData,
                      tracking_status: e.target.value,
                    })
                  }
                  required
                >
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="half_completed">Half Completed</option>
                  <option value="not_completed">Not Completed</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes:</label>
                <textarea
                  value={progressData.notes}
                  onChange={(e) =>
                    setProgressData({ ...progressData, notes: e.target.value })
                  }
                  placeholder="Add progress notes..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={progressData.completed}
                    onChange={(e) =>
                      setProgressData({
                        ...progressData,
                        completed: e.target.checked,
                      })
                    }
                  />
                  Mark as completed
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowProgressModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedSwap && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Rate {getOtherUser(selectedSwap).name}</h3>
            <form onSubmit={handleRatingSubmit}>
              <div className="form-group">
                <label>Rating:</label>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star ${
                        ratingData.rating >= star ? "filled" : ""
                      }`}
                      onClick={() =>
                        setRatingData({ ...ratingData, rating: star })
                      }
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Feedback:</label>
                <textarea
                  value={ratingData.feedback}
                  onChange={(e) =>
                    setRatingData({ ...ratingData, feedback: e.target.value })
                  }
                  placeholder="Share your experience..."
                  rows="4"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRatingModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Submit Rating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapTracking;
