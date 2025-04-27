import { db } from "../config/db.js"
import { hashPassword, comparePasswords, generateToken } from "../utils/auth.js"

// Register a new admin
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    // Check if admin already exists
    const existingAdmin = await db.query("SELECT * FROM admins WHERE email = ?", [email])
    if (existingAdmin.length > 0) {
      return res.status(409).json({ message: "Email already in use" })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create admin
    const result = await db.query("INSERT INTO admins (email, password, name) VALUES (?, ?, ?)", [
      email,
      hashedPassword,
      name || null,
    ])

    // Generate token
    const token = generateToken(result.insertId, "admin")

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    })

    return res.status(201).json({
      message: "Admin registered successfully",
      user: {
        id: result.insertId,
        email,
        name: name || null,
        role: "admin",
      },
    })
  } catch (error) {
    console.error("Admin registration error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

// Login admin
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    // Find admin
    const admins = await db.query("SELECT * FROM admins WHERE email = ?", [email])
    if (admins.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const admin = admins[0]

    // Verify password
    const passwordMatch = await comparePasswords(password, admin.password)
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Generate token
    const token = generateToken(admin.id, "admin")

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    })

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: "admin",
      },
    })
  } catch (error) {
    console.error("Admin login error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

// Logout admin
export const logout = (req, res) => {
  res.clearCookie("token")
  return res.status(200).json({ message: "Logout successful" })
}

// Get admin profile
export const getProfile = async (req, res) => {
  try {
    const adminId = req.user.id

    const admins = await db.query("SELECT id, email, name, created_at FROM admins WHERE id = ?", [adminId])
    if (admins.length === 0) {
      return res.status(404).json({ message: "Admin not found" })
    }

    return res.status(200).json({
      user: {
        ...admins[0],
        role: "admin",
      },
    })
  } catch (error) {
    console.error("Get admin profile error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

// Get dashboard data
export const getDashboardData = async (req, res) => {
  try {
    // Get counts
    const studentsCount = await db.query("SELECT COUNT(*) as count FROM students")
    const certificatesCount = await db.query("SELECT COUNT(*) as count FROM certificates")
    const verificationsCount = await db.query("SELECT COUNT(*) as count FROM verifications WHERE is_valid = 1")
    const pendingCount = await db.query("SELECT COUNT(*) as count FROM verifications WHERE is_valid = 0")

    // Get recent certificates
    const recentCertificates = await db.query(`
      SELECT c.id, c.certificate_hash, c.issue_date, s.name, 
             (SELECT COUNT(*) > 0 FROM verifications v WHERE v.certificate_id = c.id AND v.is_valid = 1) as verified
      FROM certificates c
      JOIN students s ON c.student_id = s.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `)

    // Format certificates for response
    const formattedCertificates = recentCertificates.map((cert) => ({
      id: cert.certificate_hash,
      name: cert.name,
      date: cert.issue_date,
      status: cert.verified ? "verified" : "pending",
    }))

    return res.status(200).json({
      stats: {
        students: studentsCount[0]?.count || 0,
        certificates: certificatesCount[0]?.count || 0,
        verifications: verificationsCount[0]?.count || 0,
        pending: pendingCount[0]?.count || 0,
      },
      recentCertificates: formattedCertificates,
    })
  } catch (error) {
    console.error("Get dashboard data error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
