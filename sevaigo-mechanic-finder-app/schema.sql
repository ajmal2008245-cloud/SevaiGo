-- =======================================================
-- MySQL Database Setup for Login Project
-- Database Name: login_db
-- Table Name: users
-- =======================================================

CREATE DATABASE IF NOT EXISTS login_db;
USE login_db;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Optional test user (password: password123)
-- INSERT IGNORE INTO users (email, password) VALUES ('demo@example.com', '$2a$10$wT0X8Rz6j9tV4rM9qW5zveD0R5hW3q5j2v7y4h6m9z1c8k5w3x2y1');
