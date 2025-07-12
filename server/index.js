const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { body, validationResult } = require("express-validator");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "skill_swap.db");

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000" || "http://localhost:7070",
    credentials: true,
  })
);
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || "5mb" }));
app.use(
  "/uploads",
  express.static(process.env.UPLOAD_PATH || path.join(__dirname, "uploads"))
);

// SQLite DB
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Could not connect to database", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Utility: Run SQL file to initialize DB if needed
const initSql = path.join(__dirname, "database.sql");
if (fs.existsSync(initSql)) {
  const sql = fs.readFileSync(initSql, "utf8");
  db.exec(sql, (err) => {
    if (err) console.error("Error initializing database:", err);
  });
}

// Multer setup for profile photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOAD_PATH || path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
});

// JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET || "secret", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// --- API ROUTES ---

// User registration
app.post(
  "/api/register",
  body("username").isLength({ min: 3 }),
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    const { username, email, password, name, location, availability } =
      req.body;
    const hash = await bcrypt.hash(
      password,
      parseInt(process.env.BCRYPT_ROUNDS) || 10
    );
    db.run(
      "INSERT INTO users (username, email, password_hash, name, location, availability) VALUES (?, ?, ?, ?, ?, ?)",
      [username, email, hash, name, location, availability],
      function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID });
      }
    );
  }
);

// User login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err || !user)
        return res.status(400).json({ error: "Invalid credentials" });
      if (user.is_banned) {
        return res.status(403).json({ error: "This user is banned by admin." });
      }
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(400).json({ error: "Invalid credentials" });
      const token = jwt.sign(
        { id: user.id, username: user.username, is_admin: user.is_admin },
        process.env.JWT_SECRET || "secret"
      );
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          is_admin: user.is_admin,
        },
      });
    }
  );
});

// Get public profiles (search by skill and availability)
app.get("/api/users", (req, res) => {
  const { skill, availability } = req.query;
  let sql = `SELECT u.id, u.username, u.name, u.location, u.profile_photo, u.is_public, u.availability, u.is_admin
             FROM users u
             WHERE u.is_public = 1 AND u.is_banned = 0`;
  let params = [];
  if (skill) {
    sql += ` AND u.id IN (SELECT user_id FROM user_skills_offered WHERE skill_id IN (SELECT id FROM skills WHERE name LIKE ?))`;
    params.push(`%${skill}%`);
  }
  if (availability) {
    sql += ` AND u.availability = ?`;
    params.push(availability);
  }
  db.all(sql, params, async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // For each user, fetch skills offered, wanted, and average rating
    const usersWithDetails = await Promise.all(
      rows.map(async (user) => {
        // Skills offered
        const offered = await new Promise((resolve) => {
          db.all(
            `SELECT s.name FROM user_skills_offered uso JOIN skills s ON uso.skill_id = s.id WHERE uso.user_id = ?`,
            [user.id],
            (err, skills) => resolve(skills ? skills.map((s) => s.name) : [])
          );
        });
        // Skills wanted
        const wanted = await new Promise((resolve) => {
          db.all(
            `SELECT s.name FROM user_skills_wanted usw JOIN skills s ON usw.skill_id = s.id WHERE usw.user_id = ?`,
            [user.id],
            (err, skills) => resolve(skills ? skills.map((s) => s.name) : [])
          );
        });
        // Average rating
        const rating = await new Promise((resolve) => {
          db.get(
            `SELECT AVG(rating) as avg_rating FROM ratings WHERE rated_user_id = ?`,
            [user.id],
            (err, row) =>
              resolve(
                row && row.avg_rating
                  ? parseFloat(row.avg_rating).toFixed(1)
                  : null
              )
          );
        });
        return {
          ...user,
          skills_offered: offered,
          skills_wanted: wanted,
          rating: rating,
        };
      })
    );
    res.json(usersWithDetails);
  });
});

// Get a user's public profile by ID
app.get("/api/users/:id", async (req, res) => {
  const userId = req.params.id;
  db.get(
    `SELECT id, username, name, location, profile_photo, is_public, availability FROM users WHERE id = ? AND is_public = 1 AND is_banned = 0`,
    [userId],
    async (err, user) => {
      if (err || !user)
        return res.status(404).json({ error: "User not found or not public" });
      // Skills offered
      const offered = await new Promise((resolve) => {
        db.all(
          `SELECT s.id, s.name FROM user_skills_offered uso JOIN skills s ON uso.skill_id = s.id WHERE uso.user_id = ?`,
          [userId],
          (err, skills) => resolve(skills || [])
        );
      });
      // Skills wanted
      const wanted = await new Promise((resolve) => {
        db.all(
          `SELECT s.id, s.name FROM user_skills_wanted usw JOIN skills s ON usw.skill_id = s.id WHERE usw.user_id = ?`,
          [userId],
          (err, skills) => resolve(skills || [])
        );
      });
      // Average rating
      const rating = await new Promise((resolve) => {
        db.get(
          `SELECT AVG(rating) as avg_rating FROM ratings WHERE rated_user_id = ?`,
          [userId],
          (err, row) =>
            resolve(
              row && row.avg_rating
                ? parseFloat(row.avg_rating).toFixed(1)
                : null
            )
        );
      });
      res.json({
        ...user,
        skills_offered: offered,
        skills_wanted: wanted,
        rating,
      });
    }
  );
});

// Get all ratings/feedback for a user
app.get("/api/users/:id/ratings", async (req, res) => {
  const userId = req.params.id;
  db.all(
    `SELECT r.*, u.username as rater_username, u.name as rater_name, u.profile_photo as rater_photo
     FROM ratings r
     JOIN users u ON r.rater_id = u.id
     WHERE r.rated_user_id = ?
     ORDER BY r.created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Add skill (admin approval required)
app.post("/api/skills", authenticateToken, (req, res) => {
  const { name, category, description } = req.body;
  db.run(
    "INSERT INTO skills (name, category, description, is_approved) VALUES (?, ?, ?, 0)",
    [name, category, description],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// List all approved skills
app.get("/api/skills", (req, res) => {
  db.all("SELECT * FROM skills WHERE is_approved = 1", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Offer a skill
app.post("/api/user/skills/offered", authenticateToken, (req, res) => {
  const { skill_id, description, proficiency_level } = req.body;
  db.run(
    "INSERT INTO user_skills_offered (user_id, skill_id, description, proficiency_level) VALUES (?, ?, ?, ?)",
    [req.user.id, skill_id, description, proficiency_level],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Want a skill
app.post("/api/user/skills/wanted", authenticateToken, (req, res) => {
  const { skill_id, description } = req.body;
  db.run(
    "INSERT INTO user_skills_wanted (user_id, skill_id, description) VALUES (?, ?, ?)",
    [req.user.id, skill_id, description],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Create swap request
app.post("/api/swaps", authenticateToken, (req, res) => {
  const { recipient_id, requester_skill_id, recipient_skill_id, message } =
    req.body;
  db.run(
    "INSERT INTO swap_requests (requester_id, recipient_id, requester_skill_id, recipient_skill_id, message) VALUES (?, ?, ?, ?, ?)",
    [
      req.user.id,
      recipient_id,
      requester_skill_id,
      recipient_skill_id,
      message,
    ],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Accept/reject/cancel swap
app.patch("/api/swaps/:id", authenticateToken, (req, res) => {
  const { status } = req.body;
  let trackingStatus = "pending";

  if (status === "accepted") {
    trackingStatus = "in_progress";
  }

  db.run(
    "UPDATE swap_requests SET status = ?, tracking_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (requester_id = ? OR recipient_id = ?)",
    [status, trackingStatus, req.params.id, req.user.id, req.user.id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

// Delete swap request (if not accepted)
app.delete("/api/swaps/:id", authenticateToken, (req, res) => {
  db.run(
    'DELETE FROM swap_requests WHERE id = ? AND status = "pending" AND requester_id = ?',
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ deleted: this.changes });
    }
  );
});

// List current and pending swaps for user
app.get("/api/swaps", authenticateToken, (req, res) => {
  db.all(
    `SELECT sr.*, 
            r.name as requester_name, r.username as requester_username, r.profile_photo as requester_photo,
            rec.name as recipient_name, rec.username as recipient_username, rec.profile_photo as recipient_photo,
            rs.name as requester_skill_name, recs.name as recipient_skill_name
     FROM swap_requests sr
     JOIN users r ON sr.requester_id = r.id
     JOIN users rec ON sr.recipient_id = rec.id
     JOIN skills rs ON sr.requester_skill_id = rs.id
     JOIN skills recs ON sr.recipient_skill_id = recs.id
     WHERE (sr.requester_id = ? OR sr.recipient_id = ?)
     ORDER BY sr.created_at DESC`,
    [req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Update swap progress
app.patch("/api/swaps/:id/progress", authenticateToken, (req, res) => {
  const { tracking_status, notes, completed } = req.body;
  const userId = req.user.id;

  db.get(
    "SELECT requester_id, recipient_id FROM swap_requests WHERE id = ?",
    [req.params.id],
    (err, swap) => {
      if (err || !swap)
        return res.status(404).json({ error: "Swap not found" });
      if (swap.requester_id !== userId && swap.recipient_id !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      let updateFields = [];
      let params = [];

      if (tracking_status) {
        updateFields.push("tracking_status = ?");
        params.push(tracking_status);
      }

      if (notes !== undefined) {
        if (swap.requester_id === userId) {
          updateFields.push("requester_notes = ?");
        } else {
          updateFields.push("recipient_notes = ?");
        }
        params.push(notes);
      }

      if (completed !== undefined) {
        if (swap.requester_id === userId) {
          updateFields.push("requester_completed = ?");
        } else {
          updateFields.push("recipient_completed = ?");
        }
        params.push(completed ? 1 : 0);
      }

      // Check if both users completed the swap
      if (completed) {
        db.get(
          "SELECT requester_completed, recipient_completed FROM swap_requests WHERE id = ?",
          [req.params.id],
          (err, currentSwap) => {
            if (!err && currentSwap) {
              const otherCompleted =
                swap.requester_id === userId
                  ? currentSwap.recipient_completed
                  : currentSwap.requester_completed;

              if (otherCompleted) {
                updateFields.push("tracking_status = 'completed'");
                updateFields.push("completed_at = CURRENT_TIMESTAMP");
              }
            }

            params.push(req.params.id);
            db.run(
              `UPDATE swap_requests SET ${updateFields.join(
                ", "
              )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              params,
              function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ changes: this.changes });
              }
            );
          }
        );
      } else {
        params.push(req.params.id);
        db.run(
          `UPDATE swap_requests SET ${updateFields.join(
            ", "
          )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          params,
          function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ changes: this.changes });
          }
        );
      }
    }
  );
});

// Rate/feedback after swap
app.post("/api/ratings", authenticateToken, (req, res) => {
  const { swap_id, rated_user_id, rating, feedback } = req.body;
  db.run(
    "INSERT INTO ratings (swap_id, rater_id, rated_user_id, rating, feedback) VALUES (?, ?, ?, ?, ?)",
    [swap_id, req.user.id, rated_user_id, rating, feedback],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Get current user's profile
app.get("/api/profile", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  db.get(
    `SELECT id, username, email, name, location, profile_photo, is_public, availability FROM users WHERE id = ?`,
    [userId],
    async (err, user) => {
      if (err || !user)
        return res.status(404).json({ error: "User not found" });
      // Skills offered
      const offered = await new Promise((resolve) => {
        db.all(
          `SELECT uso.id as user_skill_id, s.id, s.name FROM user_skills_offered uso JOIN skills s ON uso.skill_id = s.id WHERE uso.user_id = ?`,
          [userId],
          (err, skills) => resolve(skills || [])
        );
      });
      // Skills wanted
      const wanted = await new Promise((resolve) => {
        db.all(
          `SELECT usw.id as user_skill_id, s.id, s.name FROM user_skills_wanted usw JOIN skills s ON usw.skill_id = s.id WHERE usw.user_id = ?`,
          [userId],
          (err, skills) => resolve(skills || [])
        );
      });
      res.json({ ...user, skills_offered: offered, skills_wanted: wanted });
    }
  );
});

// Update current user's profile
app.put("/api/profile", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { name, location, is_public, availability } = req.body;
  db.run(
    `UPDATE users SET name = ?, location = ?, is_public = ?, availability = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, location, is_public ? 1 : 0, availability, userId],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Upload/change profile photo
app.post(
  "/api/profile/photo",
  authenticateToken,
  upload.single("photo"),
  (req, res) => {
    const userId = req.user.id;
    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
    if (!photoPath) return res.status(400).json({ error: "No photo uploaded" });
    db.run(
      `UPDATE users SET profile_photo = ? WHERE id = ?`,
      [photoPath, userId],
      function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ photo: photoPath });
      }
    );
  }
);

// Remove an offered skill
app.delete("/api/user/skills/offered/:id", authenticateToken, (req, res) => {
  db.run(
    "DELETE FROM user_skills_offered WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ deleted: this.changes });
    }
  );
});
// Remove a wanted skill
app.delete("/api/user/skills/wanted/:id", authenticateToken, (req, res) => {
  db.run(
    "DELETE FROM user_skills_wanted WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ deleted: this.changes });
    }
  );
});

// --- ADMIN ROUTES ---

// Get all users (admin only)
app.get("/api/admin/users", authenticateToken, async (req, res) => {
  if (!req.user.is_admin) return res.sendStatus(403);

  db.all(
    `SELECT id, username, email, name, location, profile_photo, is_public, is_admin, is_banned, availability, created_at FROM users ORDER BY created_at DESC`,
    [],
    async (err, users) => {
      if (err) return res.status(500).json({ error: err.message });

      // For each user, fetch their skills
      const usersWithSkills = await Promise.all(
        users.map(async (user) => {
          const offered = await new Promise((resolve) => {
            db.all(
              `SELECT uso.id as user_skill_id, s.id, s.name FROM user_skills_offered uso JOIN skills s ON uso.skill_id = s.id WHERE uso.user_id = ?`,
              [user.id],
              (err, skills) => resolve(skills || [])
            );
          });
          const wanted = await new Promise((resolve) => {
            db.all(
              `SELECT usw.id as user_skill_id, s.id, s.name FROM user_skills_wanted usw JOIN skills s ON usw.skill_id = s.id WHERE usw.user_id = ?`,
              [user.id],
              (err, skills) => resolve(skills || [])
            );
          });
          return { ...user, skills_offered: offered, skills_wanted: wanted };
        })
      );

      res.json(usersWithSkills);
    }
  );
});

// Update user (ban/unban, promote/demote)
app.patch("/api/admin/users/:id", authenticateToken, (req, res) => {
  if (!req.user.is_admin) return res.sendStatus(403);
  const { is_banned, is_admin } = req.body;

  let updates = [];
  let params = [];

  if (is_banned !== undefined) {
    updates.push("is_banned = ?");
    params.push(is_banned ? 1 : 0);
  }

  if (is_admin !== undefined) {
    updates.push("is_admin = ?");
    params.push(is_admin ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No valid updates provided" });
  }

  params.push(req.params.id);

  db.run(
    `UPDATE users SET ${updates.join(
      ", "
    )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params,
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

// Get pending skills (admin only)
app.get("/api/admin/skills/pending", authenticateToken, (req, res) => {
  if (!req.user.is_admin) return res.sendStatus(403);

  db.all(
    "SELECT * FROM skills WHERE is_approved = 0 ORDER BY created_at DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Approve/reject skill
app.patch("/api/admin/skills/:id", authenticateToken, (req, res) => {
  if (!req.user.is_admin) return res.sendStatus(403);
  const { is_approved } = req.body;
  db.run(
    "UPDATE skills SET is_approved = ? WHERE id = ?",
    [is_approved, req.params.id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

// Get platform statistics (admin only)
app.get("/api/admin/stats", authenticateToken, async (req, res) => {
  if (!req.user.is_admin) return res.sendStatus(403);

  try {
    const stats = {};

    // Total users
    stats.totalUsers = await new Promise((resolve) => {
      db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
        resolve(err ? 0 : row.count);
      });
    });

    // Active users (users with skills)
    stats.activeUsers = await new Promise((resolve) => {
      db.get(
        "SELECT COUNT(DISTINCT user_id) as count FROM user_skills_offered",
        [],
        (err, row) => {
          resolve(err ? 0 : row.count);
        }
      );
    });

    // Total skills
    stats.totalSkills = await new Promise((resolve) => {
      db.get(
        "SELECT COUNT(*) as count FROM skills WHERE is_approved = 1",
        [],
        (err, row) => {
          resolve(err ? 0 : row.count);
        }
      );
    });

    // Pending skills
    stats.pendingSkills = await new Promise((resolve) => {
      db.get(
        "SELECT COUNT(*) as count FROM skills WHERE is_approved = 0",
        [],
        (err, row) => {
          resolve(err ? 0 : row.count);
        }
      );
    });

    // Total swaps
    stats.totalSwaps = await new Promise((resolve) => {
      db.get("SELECT COUNT(*) as count FROM swap_requests", [], (err, row) => {
        resolve(err ? 0 : row.count);
      });
    });

    // Completed swaps
    stats.completedSwaps = await new Promise((resolve) => {
      db.get(
        "SELECT COUNT(*) as count FROM swap_requests WHERE status = 'accepted'",
        [],
        (err, row) => {
          resolve(err ? 0 : row.count);
        }
      );
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create platform-wide message
app.post("/api/admin/messages", authenticateToken, (req, res) => {
  if (!req.user.is_admin) return res.sendStatus(403);
  const { title, message } = req.body;
  db.run(
    "INSERT INTO admin_messages (admin_id, title, message) VALUES (?, ?, ?)",
    [req.user.id, title, message],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      // After inserting, send email to all non-banned users
      db.all("SELECT email FROM users WHERE is_banned = 0", [], (err, users) => {
        if (err) return; // Don't block response if email fails
        const emails = users.map(u => u.email);
        if (emails.length > 0) {
          const msg = {
            to: emails,
            from: process.env.SENDGRID_FROM_EMAIL, // Must be a verified sender
            subject: title,
            text: message,
            html: `<strong>${title}</strong><br>${message}`,
          };
          sgMail.sendMultiple(msg).catch(console.error);
        }
      });
      res.json({ id: this.lastID });
    }
  );
});

// Helper: Convert array of objects to CSV
function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(",")];
  for (const row of rows) {
    csv.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  }
  return csv.join("\n");
}

// Download reports (user activity, feedback, swaps)
app.get("/api/admin/reports/:type", authenticateToken, (req, res) => {
  if (!req.user.is_admin) return res.sendStatus(403);
  let sql = "";
  let params = [];
  let transformRow = (row) => row;
  const userId = req.query.user_id;
  switch (req.params.type) {
    case "users":
      sql =
        "SELECT username, email, name, location, profile_photo, is_public, is_admin, is_banned, availability, created_at, updated_at FROM users";
      if (userId) {
        sql += " WHERE id = ?";
        params.push(userId);
      }
      break;
    case "feedback":
      sql = `SELECT r.rating, r.feedback, r.created_at,
        ru.name as rated_user_name, ru.username as rated_user_username,
        u.name as rater_name, u.username as rater_username
        FROM ratings r
        JOIN users u ON r.rater_id = u.id
        JOIN users ru ON r.rated_user_id = ru.id`;
      if (userId) {
        sql += " WHERE r.rated_user_id = ? OR r.rater_id = ?";
        params.push(userId, userId);
      }
      break;
    case "swaps":
      sql = `SELECT s.status, s.message, s.created_at, s.updated_at,
        ru.name as requester_name, ru.username as requester_username,
        uu.name as recipient_name, uu.username as recipient_username,
        s.requester_skill_id, s.recipient_skill_id
        FROM swap_requests s
        JOIN users ru ON s.requester_id = ru.id
        JOIN users uu ON s.recipient_id = uu.id`;
      if (userId) {
        sql += " WHERE s.requester_id = ? OR s.recipient_id = ?";
        params.push(userId, userId);
      }
      break;
    default:
      return res.status(400).json({ error: "Invalid report type" });
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Remove any id columns from the result
    const cleanRows = rows.map((row) => {
      const newRow = { ...row };
      Object.keys(newRow).forEach((key) => {
        if (key === "id" || key.endsWith("_id")) delete newRow[key];
      });
      return newRow;
    });
    if (req.query.format === "csv") {
      const csv = toCSV(cleanRows);
      res.header("Content-Type", "text/csv");
      res.attachment(
        `${req.params.type}${userId ? `_user_${userId}` : ""}_report.csv`
      );
      return res.send(csv);
    } else {
      res.json(cleanRows);
    }
  });
});

// Proxy route for mail API
app.post("/api/mail/send", async (req, res) => {
  try {
    const response = await axios.post("https://localhost:7070/MailSystem/send", req.body, {
      headers: {
        'Content-Type': 'application/json'
      },
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });
    res.json(response.data);
  } catch (error) {
    console.error("Mail API Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: "Failed to send email",
      details: error.response?.data || error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
