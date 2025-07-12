import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import "./Swaps.css";

const REQUESTS_PER_PAGE = 5;

const Swaps = () => {
  const { user } = useAuth();
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [updating, setUpdating] = useState(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateSwap, setRateSwap] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  useEffect(() => {
    fetchSwaps();
    // eslint-disable-next-line
  }, []);

  // Helper: check if current user has rated the other user for this swap
  const hasRated = (swap) => {
    if (!swap.ratings) return false;
    return swap.ratings.some((r) => r.rater_id === user.id);
  };

  // Fetch swaps and also fetch ratings for each swap
  const fetchSwaps = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/swaps");
      // For each swap, fetch user and skill info, and ratings
      const detailedSwaps = await Promise.all(
        res.data.map(async (swap) => {
          // Get other user info
          const otherUserId =
            swap.requester_id === user.id
              ? swap.recipient_id
              : swap.requester_id;
          let otherUser = null;
          try {
            const userRes = await axios.get(`/api/users/${otherUserId}`);
            otherUser = userRes.data;
          } catch {
            otherUser = { name: "[Deleted]", profile_photo: "", username: "" };
          }
          // Get skill names
          let requesterSkill = "";
          let recipientSkill = "";
          try {
            const skillsRes = await axios.get("/api/skills");
            const skills = skillsRes.data;
            requesterSkill =
              skills.find((s) => s.id === swap.requester_skill_id)?.name || "";
            recipientSkill =
              skills.find((s) => s.id === swap.recipient_skill_id)?.name || "";
          } catch {}
          // Fetch ratings for this swap
          let ratings = [];
          try {
            const ratingsRes = await axios.get(
              `/api/users/${otherUserId}/ratings`
            );
            ratings = ratingsRes.data.filter((r) => r.swap_id === swap.id);
          } catch {}
          return {
            ...swap,
            otherUser,
            requesterSkill,
            recipientSkill,
            ratings,
          };
        })
      );
      setSwaps(detailedSwaps);
    } catch (err) {
      toast.error("Failed to load swap requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (swapId, status) => {
    setUpdating(swapId + status);
    try {
      await axios.patch(`/api/swaps/${swapId}`, { status });
      toast.success(`Request ${status}`);
      fetchSwaps();
    } catch (err) {
      toast.error("Failed to update request");
    } finally {
      setUpdating(null);
    }
  };

  const openRateModal = (swap) => {
    setRateSwap(swap);
    setRatingValue(5);
    setRatingFeedback("");
    setShowRateModal(true);
  };

  const handleRateSubmit = async (e) => {
    e.preventDefault();
    setRatingSubmitting(true);
    try {
      await axios.post("/api/ratings", {
        swap_id: rateSwap.id,
        rated_user_id: rateSwap.otherUser.id,
        rating: ratingValue,
        feedback: ratingFeedback,
      });
      toast.success("Rating submitted!");
      setShowRateModal(false);
      fetchSwaps();
    } catch (err) {
      toast.error("Failed to submit rating");
    } finally {
      setRatingSubmitting(false);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(swaps.length / REQUESTS_PER_PAGE);
  const paginatedSwaps = swaps.slice(
    (currentPage - 1) * REQUESTS_PER_PAGE,
    currentPage * REQUESTS_PER_PAGE
  );

  if (loading) return <div className="swaps-card">Loading...</div>;

  return (
    <div className="swaps-card">
      <h2>Swap Requests</h2>
      {paginatedSwaps.length === 0 && <div>No swap requests found.</div>}
      {paginatedSwaps.map((swap) => {
        const isRecipient = swap.recipient_id === user.id;
        const canRate =
          swap.status === "accepted" && !hasRated(swap) && !isRecipient;
        return (
          <div
            key={swap.id}
            className={`swap-request-card status-${swap.status}`}
          >
            <div className="swap-request-header">
              {swap.otherUser?.profile_photo ? (
                <img
                  src={swap.otherUser.profile_photo}
                  alt={swap.otherUser.name}
                  className="swap-user-avatar"
                />
              ) : (
                <div className="swap-user-avatar">?</div>
              )}
              <div className="swap-user-info">
                <div className="swap-user-name">{swap.otherUser?.name}</div>
                <div className="swap-user-username">
                  @{swap.otherUser?.username}
                </div>
              </div>
              <div className={`swap-status swap-status-${swap.status}`}>
                {swap.status}
              </div>
            </div>
            <div className="swap-request-details">
              <div>
                <strong>Your Skill:</strong>{" "}
                {isRecipient ? swap.recipientSkill : swap.requesterSkill}
              </div>
              <div>
                <strong>Their Skill:</strong>{" "}
                {isRecipient ? swap.requesterSkill : swap.recipientSkill}
              </div>
              {swap.message && (
                <div>
                  <strong>Message:</strong> {swap.message}
                </div>
              )}
            </div>
            <div className="swap-request-actions">
              {isRecipient && swap.status === "pending" && (
                <>
                  <button
                    className="btn btn-success"
                    onClick={() => handleAction(swap.id, "accepted")}
                    disabled={updating === swap.id + "accepted"}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleAction(swap.id, "rejected")}
                    disabled={updating === swap.id + "rejected"}
                  >
                    Reject
                  </button>
                </>
              )}
              {canRate && (
                <button
                  className="btn btn-primary"
                  onClick={() => openRateModal(swap)}
                >
                  Rate
                </button>
              )}
            </div>
          </div>
        );
      })}
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="swaps-pagination">
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
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
            >
              {page}
            </button>
          ))}
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
        </div>
      )}
      {/* Rate Modal */}
      {showRateModal && (
        <div className="swap-modal-overlay">
          <div className="swap-modal">
            <h3>Rate {rateSwap.otherUser.name}</h3>
            <form onSubmit={handleRateSubmit}>
              <div className="swap-modal-field">
                <label>Rating:</label>
                <select
                  value={ratingValue}
                  onChange={(e) => setRatingValue(Number(e.target.value))}
                >
                  {[5, 4, 3, 2, 1].map((v) => (
                    <option key={v} value={v}>
                      {v} Star{v > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="swap-modal-field">
                <label>Feedback:</label>
                <textarea
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  rows={3}
                  placeholder="Write feedback..."
                />
              </div>
              <div className="swap-modal-actions">
                <button
                  className="btn btn-success"
                  type="submit"
                  disabled={ratingSubmitting}
                >
                  Submit
                </button>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  disabled={ratingSubmitting}
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

export default Swaps;
