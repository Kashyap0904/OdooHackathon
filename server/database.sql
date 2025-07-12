-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    profile_photo VARCHAR(255),
    is_public BOOLEAN DEFAULT 1,
    is_admin BOOLEAN DEFAULT 0,
    is_banned BOOLEAN DEFAULT 0,
    availability TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    is_approved BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User skills (offered)
CREATE TABLE user_skills_offered (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    description TEXT,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- User skills (wanted)
CREATE TABLE user_skills_wanted (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Swap requests
CREATE TABLE swap_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    requester_skill_id INTEGER NOT NULL,
    recipient_skill_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected, cancelled
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (requester_skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Ratings and feedback
CREATE TABLE ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    swap_id INTEGER NOT NULL,
    rater_id INTEGER NOT NULL,
    rated_user_id INTEGER NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (swap_id) REFERENCES swap_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rated_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin messages
CREATE TABLE admin_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);