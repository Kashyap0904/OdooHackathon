import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./Skills.css";

const Skills = () => {
  const [approvedSkills, setApprovedSkills] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [offeredSkills, setOfferedSkills] = useState([]);
  const [wantedSkills, setWantedSkills] = useState([]);
  const [showOfferedDropdown, setShowOfferedDropdown] = useState(false);
  const [showWantedDropdown, setShowWantedDropdown] = useState(false);
  const [showNewSkillForm, setShowNewSkillForm] = useState(false);
  const [offeredSearchTerm, setOfferedSearchTerm] = useState("");
  const [wantedSearchTerm, setWantedSearchTerm] = useState("");
  const [newSkill, setNewSkill] = useState({
    name: "",
    category: "",
    description: "",
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".multi-select-container")) {
        setShowOfferedDropdown(false);
        setShowWantedDropdown(false);
        setOfferedSearchTerm("");
        setWantedSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [skillsRes, profileRes] = await Promise.all([
        axios.get("/api/skills"),
        axios.get("/api/profile"),
      ]);
      setApprovedSkills(skillsRes.data);
      setProfile(profileRes.data);
    } catch (err) {
      toast.error("Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffered = async (e) => {
    e.preventDefault();
    if (offeredSkills.length === 0) return;
    setAdding(true);
    try {
      const promises = offeredSkills.map((skillId) =>
        axios.post("/api/user/skills/offered", {
          skill_id: skillId,
          description: "",
          proficiency_level: "intermediate",
        })
      );
      await Promise.all(promises);
      toast.success(`${offeredSkills.length} skill(s) added to offered`);
      setOfferedSkills([]);
      setShowOfferedDropdown(false);
      fetchData();
    } catch (err) {
      toast.error("Failed to add skills");
    } finally {
      setAdding(false);
    }
  };

  const handleAddWanted = async (e) => {
    e.preventDefault();
    if (wantedSkills.length === 0) return;
    setAdding(true);
    try {
      const promises = wantedSkills.map((skillId) =>
        axios.post("/api/user/skills/wanted", {
          skill_id: skillId,
          description: "",
        })
      );
      await Promise.all(promises);
      toast.success(`${wantedSkills.length} skill(s) added to wanted`);
      setWantedSkills([]);
      setShowWantedDropdown(false);
      fetchData();
    } catch (err) {
      toast.error("Failed to add skills");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveOffered = async (id) => {
    setAdding(true);
    try {
      await axios.delete(`/api/user/skills/offered/${id}`);
      toast.success("Skill removed");
      fetchData();
    } catch (err) {
      toast.error("Failed to remove skill");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveWanted = async (id) => {
    setAdding(true);
    try {
      await axios.delete(`/api/user/skills/wanted/${id}`);
      toast.success("Skill removed");
      fetchData();
    } catch (err) {
      toast.error("Failed to remove skill");
    } finally {
      setAdding(false);
    }
  };

  const handleSubmitNewSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.name || !newSkill.category) {
      toast.error("Please fill in all required fields");
      return;
    }
    setAdding(true);
    try {
      await axios.post("/api/skills", newSkill);
      toast.success("Skill submitted for approval");
      setNewSkill({ name: "", category: "", description: "" });
      setShowNewSkillForm(false);
    } catch (err) {
      toast.error("Failed to submit skill");
    } finally {
      setAdding(false);
    }
  };

  const handleOfferedSkillToggle = (skillId) => {
    setOfferedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleWantedSkillToggle = (skillId) => {
    setWantedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  // Filter out already added skills from dropdowns and apply search
  const getAvailableOfferedSkills = () => {
    const currentOfferedSkillIds =
      profile.skills_offered?.map((s) => s.id) || [];
    const availableSkills = approvedSkills.filter(
      (skill) => !currentOfferedSkillIds.includes(skill.id)
    );

    if (!offeredSearchTerm.trim()) return availableSkills;

    return availableSkills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(offeredSearchTerm.toLowerCase()) ||
        skill.category.toLowerCase().includes(offeredSearchTerm.toLowerCase())
    );
  };

  const getAvailableWantedSkills = () => {
    const currentWantedSkillIds = profile.skills_wanted?.map((s) => s.id) || [];
    const availableSkills = approvedSkills.filter(
      (skill) => !currentWantedSkillIds.includes(skill.id)
    );

    if (!wantedSearchTerm.trim()) return availableSkills;

    return availableSkills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(wantedSearchTerm.toLowerCase()) ||
        skill.category.toLowerCase().includes(wantedSearchTerm.toLowerCase())
    );
  };

  const getSelectedOfferedSkillsText = () => {
    if (offeredSkills.length === 0) return "Select skills...";
    if (offeredSkills.length === 1) {
      const skill = approvedSkills.find((s) => s.id === offeredSkills[0]);
      return skill ? skill.name : "Select skills...";
    }
    return `${offeredSkills.length} skills selected`;
  };

  const getSelectedWantedSkillsText = () => {
    if (wantedSkills.length === 0) return "Select skills...";
    if (wantedSkills.length === 1) {
      const skill = approvedSkills.find((s) => s.id === wantedSkills[0]);
      return skill ? skill.name : "Select skills...";
    }
    return `${wantedSkills.length} skills selected`;
  };

  if (loading || !profile) return <div className="skills-card">Loading...</div>;

  return (
    <div className="skills-card">
      <h2>My Skills</h2>

      <div className="skills-header">
        <button
          className="btn btn-primary"
          onClick={() => setShowNewSkillForm(!showNewSkillForm)}
        >
          {showNewSkillForm ? "Cancel" : "Submit New Skill"}
        </button>
      </div>

      {showNewSkillForm && (
        <div className="new-skill-form">
          <h4>Submit New Skill</h4>
          <form onSubmit={handleSubmitNewSkill}>
            <div className="form-group">
              <label>Skill Name *</label>
              <input
                type="text"
                value={newSkill.name}
                onChange={(e) =>
                  setNewSkill({ ...newSkill, name: e.target.value })
                }
                placeholder="e.g., Machine Learning"
                required
              />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select
                value={newSkill.category}
                onChange={(e) =>
                  setNewSkill({ ...newSkill, category: e.target.value })
                }
                required
              >
                <option value="">Select a category...</option>
                <option value="Programming">Programming</option>
                <option value="Language">Language</option>
                <option value="Music">Music</option>
                <option value="Art">Art</option>
                <option value="Fitness">Fitness</option>
                <option value="Sports">Sports</option>
                <option value="Cooking">Cooking</option>
                <option value="Business">Business</option>
                <option value="Crafts">Crafts</option>
                <option value="Education">Education</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newSkill.description}
                onChange={(e) =>
                  setNewSkill({ ...newSkill, description: e.target.value })
                }
                placeholder="Brief description of the skill..."
                rows="3"
              />
            </div>
            <button type="submit" className="btn btn-success" disabled={adding}>
              Submit for Approval
            </button>
          </form>
        </div>
      )}

      <div className="skills-section">
        <h4>Skills I Offer</h4>
        <form onSubmit={handleAddOffered} className="skills-form">
          <div className="multi-select-container">
            <button
              type="button"
              className="multi-select-button"
              onClick={() => setShowOfferedDropdown(!showOfferedDropdown)}
              disabled={adding}
            >
              {getSelectedOfferedSkillsText()}
              <span className="dropdown-arrow">▼</span>
            </button>
            {showOfferedDropdown && (
              <div className="multi-select-dropdown">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search skills..."
                    value={offeredSearchTerm}
                    onChange={(e) => setOfferedSearchTerm(e.target.value)}
                    className="search-input"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="skills-options">
                  {getAvailableOfferedSkills().map((skill) => (
                    <label key={skill.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={offeredSkills.includes(skill.id)}
                        onChange={() => handleOfferedSkillToggle(skill.id)}
                      />
                      <span className="checkbox-label">
                        {skill.name}
                        <span className="skill-category">
                          ({skill.category})
                        </span>
                      </span>
                    </label>
                  ))}
                  {getAvailableOfferedSkills().length === 0 && (
                    <div className="no-results">
                      {offeredSearchTerm
                        ? "No skills found"
                        : "No available skills"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            className="btn btn-success"
            type="submit"
            disabled={adding || offeredSkills.length === 0}
          >
            Add ({offeredSkills.length})
          </button>
        </form>
        <div className="skills-list">
          {profile.skills_offered && profile.skills_offered.length > 0 ? (
            profile.skills_offered.map((s) => (
              <span key={s.user_skill_id} className="skill-chip offered">
                {s.name}
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveOffered(s.user_skill_id)}
                  disabled={adding}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="no-skills">No offered skills yet.</span>
          )}
        </div>
      </div>
      <div className="skills-section">
        <h4>Skills I Want</h4>
        <form onSubmit={handleAddWanted} className="skills-form">
          <div className="multi-select-container">
            <button
              type="button"
              className="multi-select-button"
              onClick={() => setShowWantedDropdown(!showWantedDropdown)}
              disabled={adding}
            >
              {getSelectedWantedSkillsText()}
              <span className="dropdown-arrow">▼</span>
            </button>
            {showWantedDropdown && (
              <div className="multi-select-dropdown">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search skills..."
                    value={wantedSearchTerm}
                    onChange={(e) => setWantedSearchTerm(e.target.value)}
                    className="search-input"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="skills-options">
                  {getAvailableWantedSkills().map((skill) => (
                    <label key={skill.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={wantedSkills.includes(skill.id)}
                        onChange={() => handleWantedSkillToggle(skill.id)}
                      />
                      <span className="checkbox-label">
                        {skill.name}
                        <span className="skill-category">
                          ({skill.category})
                        </span>
                      </span>
                    </label>
                  ))}
                  {getAvailableWantedSkills().length === 0 && (
                    <div className="no-results">
                      {wantedSearchTerm
                        ? "No skills found"
                        : "No available skills"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={adding || wantedSkills.length === 0}
          >
            Add ({wantedSkills.length})
          </button>
        </form>
        <div className="skills-list">
          {profile.skills_wanted && profile.skills_wanted.length > 0 ? (
            profile.skills_wanted.map((s) => (
              <span key={s.user_skill_id} className="skill-chip wanted">
                {s.name}
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveWanted(s.user_skill_id)}
                  disabled={adding}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="no-skills">No wanted skills yet.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Skills;
