import mysql from "mysql2/promise"

// Define types for query results
export type QueryResult = any[] | { [key: string]: any }
export type RowDataPacket = { [key: string]: any }

// Create a .env.local file with these variables
// Database connection pool with proper error handling
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "", // Make sure this matches your MySQL password
  database: process.env.DB_NAME || "certify_chain",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Helper function to execute queries with better type handling and error management
export const db = {
  query: async (sql: string, params: any[] = []): Promise<QueryResult> => {
    try {
      // Log the query for debugging (remove in production)
      console.log("Executing query:", sql, "with params:", params)

      const [rows] = await pool.execute(sql, params)
      return rows as QueryResult
    } catch (error) {
      console.error("Database query error:", error)

      // Check if it's a connection error and provide more helpful message
      if ((error as any).code === "ER_ACCESS_DENIED_ERROR") {
        console.error("Database connection failed. Please check your DB_USER and DB_PASSWORD environment variables.")
      }

      throw error
    }
  },

  // Test connection method
  testConnection: async () => {
    try {
      await pool.execute("SELECT 1")
      console.log("Database connection successful!")
      return true
    } catch (error) {
      console.error("Database connection test failed:", error)
      return false
    }
  },
}

// Initialize database tables
export const initDatabase = async () => {
  try {
    // Test connection first
    const connectionSuccessful = await db.testConnection()
    if (!connectionSuccessful) {
      console.error("Database initialization skipped due to connection failure")
      return
    }

    // Create admins table
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create verifiers table
    await db.query(`
      CREATE TABLE IF NOT EXISTS verifiers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create students table
    await db.query(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        father_name VARCHAR(255),
        degree VARCHAR(255) NOT NULL,
        marks VARCHAR(50),
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create certificates table
    await db.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        certificate_hash VARCHAR(255) NOT NULL UNIQUE,
        issue_date DATE NOT NULL,
        certificate_data TEXT,
        certificate_file VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id)
      )
    `)

    // Create verifications table
    await db.query(`
      CREATE TABLE IF NOT EXISTS verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        certificate_id INT NOT NULL,
        verification_date DATETIME NOT NULL,
        is_valid BOOLEAN NOT NULL,
        verifier_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (certificate_id) REFERENCES certificates(id)
      )
    `)

    console.log("Database tables initialized")
  } catch (error) {
    console.error("Database initialization error:", error)
    throw error
  }
}
