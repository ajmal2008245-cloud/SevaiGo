-- PostgreSQL Database Setup for Login Project

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional test user (password: password123)
-- INSERT INTO users (email, password) VALUES ('demo@example.com', '$2a$10$wT8XRZ6j9tV4rM9w5zVeR0eR5hW5q2j7y4h6w9z1c8k5w3x2y1z') ON CONFLICT (email) DO NOTHING;
