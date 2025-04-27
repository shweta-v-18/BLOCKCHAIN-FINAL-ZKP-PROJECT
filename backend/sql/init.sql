-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS certify_chain;
USE certify_chain;

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create verifiers table
CREATE TABLE IF NOT EXISTS verifiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  father_name VARCHAR(255),
  degree VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  marks VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  certificate_hash VARCHAR(255) NOT NULL UNIQUE,
  issue_date DATE NOT NULL,
  certificate_data TEXT NOT NULL,
  certificate_file VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Create verifications table
CREATE TABLE IF NOT EXISTS verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  certificate_id INT NOT NULL,
  verification_date TIMESTAMP NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  verifier_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (certificate_id) REFERENCES certificates(id),
  FOREIGN KEY (verifier_id) REFERENCES verifiers(id)
);

-- Insert sample admin
INSERT INTO admins (name, email, password) 
VALUES ('Admin User', 'admin@example.com', '$2b$10$1JXgDfWHWZZ7KhNvxHfBxuC5Hl/DFd9qZZQgGS.U53ZpCcYfQNjFu');
-- Password is 'password123'

-- Insert sample verifier
INSERT INTO verifiers (name, email, password, organization) 
VALUES ('Verifier User', 'verifier@example.com', '$2b$10$1JXgDfWHWZZ7KhNvxHfBxuC5Hl/DFd9qZZQgGS.U53ZpCcYfQNjFu', 'Example University');
-- Password is 'password123'
