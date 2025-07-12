const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { body, validationResult } = require("express-validator");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "skill_swap.db");

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
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
  let sql = `SELECT u.id, u.username, u.name, u.location, u.profile_photo, u.is_public, u.availability
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
  db.run(
    "UPDATE swap_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (requester_id = ? OR recipient_id = ?)",
    [status, req.params.id, req.user.id, req.user.id],
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
    "SELECT * FROM swap_requests WHERE (requester_id = ? OR recipient_id = ?)",
    [req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
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

// --- ADMIN ROUTES ---

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

// Ban user
app.patch("/api/admin/users/:id/ban", authenticateToken, (req, res) => {
  if (!req.user.is_admin) return res.sendStatus(403);
  db.run(
    "UPDATE users SET is_banned = 1 WHERE id = ?",
    [req.params.id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

// Platform-wide message
app.post("/api/admin/messages", authenticateToken, (req, res) => {
  if (!req.user.is_admin) return res.sendStatus(403);
  const { title, message } = req.body;
  db.run(
    "INSERT INTO admin_messages (admin_id, title, message) VALUES (?, ?, ?)",
    [req.user.id, title, message],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Download reports (user activity, feedback, swaps)
app.get("/api/admin/reports/:type", authenticateToken, (req, res) => {
  if (!req.user.is_admin) return res.sendStatus(403);
  let sql = "";
  switch (req.params.type) {
    case "users":
      sql = "SELECT * FROM users";
      break;
    case "feedback":
      sql = "SELECT * FROM ratings";
      break;
    case "swaps":
      sql = "SELECT * FROM swap_requests";
      break;
    default:
      return res.status(400).json({ error: "Invalid report type" });
  }
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
