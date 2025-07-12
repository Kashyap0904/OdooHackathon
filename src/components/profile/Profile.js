import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./Profile.css";

const AVAILABILITY_OPTIONS = [
  "Weekdays",
  "Weekends",
  "Evenings",
  "Mornings",
  "Afternoons",
];

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [editProfile, setEditProfile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/profile");
      setProfile(res.data);
      setEditProfile(res.data);
    } catch (err) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditProfile((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePhotoChange = (e) => {
    setPhotoFile(e.target.files[0]);
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    const formData = new FormData();
    formData.append("photo", photoFile);
    try {
      const res = await axios.post("/api/profile/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEditProfile((prev) => ({ ...prev, profile_photo: res.data.photo }));
      setProfile((prev) => ({ ...prev, profile_photo: res.data.photo }));
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error("Failed to upload photo");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put("/api/profile", {
        name: editProfile.name,
        location: editProfile.location,
        is_public: editProfile.is_public,
        availability: editProfile.availability,
      });
      setProfile(editProfile);
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setEditProfile(profile);
    setPhotoFile(null);
  };

  if (loading || !editProfile) return <div className="card">Loading...</div>;

  return (
    <div className="profile-card">
      <h2 style={{ marginBottom: 24 }}>User Profile</h2>
      <div className="profile-header">
        <div>
          {editProfile.profile_photo ? (
            <img
              src={editProfile.profile_photo}
              alt="Profile"
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar">?</div>
          )}
          <div className="profile-photo-upload">
            <label htmlFor="profile-photo-input">Choose Photo</label>
            <input
              id="profile-photo-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />
            <button
              className="btn-upload"
              onClick={handlePhotoUpload}
              disabled={!photoFile}
              type="button"
            >
              Upload Photo
            </button>
          </div>
        </div>
        <form className="profile-form">
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={editProfile.name || ""}
            onChange={handleChange}
          />
          <label>Location:</label>
          <input
            type="text"
            name="location"
            value={editProfile.location || ""}
            onChange={handleChange}
          />
          <label>Availability:</label>
          <select
            name="availability"
            value={editProfile.availability || ""}
            onChange={handleChange}
          >
            <option value="">Select...</option>
            {AVAILABILITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="is_public"
              checked={!!editProfile.is_public}
              onChange={handleChange}
            />
            Public Profile
          </label>
        </form>
      </div>
      <div className="profile-skills">
        <strong>Skills Offered:</strong>
        {editProfile.skills_offered && editProfile.skills_offered.length > 0 ? (
          editProfile.skills_offered.map((s) => (
            <span key={s.id} className="profile-skill-chip">
              {s.name}
            </span>
          ))
        ) : (
          <span style={{ color: "#aaa" }}> None</span>
        )}
      </div>
      <div className="profile-skills">
        <strong>Skills Wanted:</strong>
        {editProfile.skills_wanted && editProfile.skills_wanted.length > 0 ? (
          editProfile.skills_wanted.map((s) => (
            <span key={s.id} className="profile-skill-chip wanted">
              {s.name}
            </span>
          ))
        ) : (
          <span style={{ color: "#aaa" }}> None</span>
        )}
      </div>
      <div className="profile-actions">
        <button
          className="btn btn-success"
          onClick={handleSave}
          disabled={saving}
        >
          Save
        </button>
        <button
          className="btn btn-danger"
          onClick={handleDiscard}
          disabled={saving}
        >
          Discard
        </button>
      </div>
    </div>
  );
};

export default Profile;
