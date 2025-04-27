import { db } from "../config/db.js"
import { hashPassword, comparePasswords, generateToken } from "../utils/auth.js"

// Register a new verifier
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    // Check if verifier already exists
    const existingVerifier = await db.query("SELECT * FROM verifiers WHERE email = ?", [email])
    if (existingVerifier.length > 0) {
      return res.status(409).json({ message: "Email already in use" })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create verifier
    const result = await db.query("INSERT INTO verifiers (email, password, name) VALUES (?, ?, ?)", [
      email,
      hashedPassword,
      name || null,
    ])

    // Generate token
    const token = generateToken(result.insertId, "verifier")

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    })

    return res.status(201).json({
      message: "Verifier registered successfully",
      user: {
        id: result.insertId,
        email,
        name: name || null,
        role: "verifier",
      },
    })
  } catch (error) {
    console.error("Verifier registration error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

// Login verifier
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    // Find verifier
    const verifiers = await db.query("SELECT * FROM verifiers WHERE email = ?", [email])
    if (verifiers.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const verifier = verifiers[0]

    // Verify password
    const passwordMatch = await comparePasswords(password, verifier.password)
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Generate token
    const token = generateToken(verifier.id, "verifier")

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    })

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: verifier.id,
        email: verifier.email,
        name: verifier.name,
        role: "verifier",
      },
    })
  } catch (error) {
    console.error("Verifier login error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

// Logout verifier
export const logout = (req, res) => {
  res.clearCookie("token")
  return res.status(200).json({ message: "Logout successful" })
}

// Get verifier profile
export const getProfile = async (req, res) => {
  try {
    const verifierId = req.user.id

    const verifiers = await db.query("SELECT id, email, name, created_at FROM verifiers WHERE id = ?", [verifierId])
    if (verifiers.length === 0) {
      return res.status(404).json({ message: "Verifier not found" })
    }

    return res.status(200).json({
      user: {
        ...verifiers[0],
        role: "verifier",
      },
    })
  } catch (error) {
    console.error("Get verifier profile error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

// Get verification history
export const getVerificationHistory = async (req, res) => {
  try {
    const verifierId = req.user.id

    // Get verification history for this verifier
    // In a real app, you would link verifications to verifiers
    // For now, we'll just return all verifications
    const verifications = await db.query(`
      SELECT v.id, v.verification_date, v.is_valid, c.certificate_hash, s.name
      FROM verifications v
      JOIN certificates c ON v.certificate_id = c.id
      JOIN students s ON c.student_id = s.id
      ORDER BY v.verification_date DESC
      LIMIT 20
    `)

    return res.status(200).json({
      verifications: verifications.map((v) => ({
        id: v.id,
        date: v.verification_date,
        isValid: v.is_valid === 1,
        certificateHash: v.certificate_hash,
        studentName: v.name,
      })),
    })
  } catch (error) {
    console.error("Get verification history error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

// Record a verification
export const recordVerification = async (req, res) => {
  try {
    const { certificateHash, isValid } = req.body
    const verifierId = req.user.id

    // Get certificate ID from hash
    const certificates = await db.query("SELECT id FROM certificates WHERE certificate_hash = ?", [certificateHash])

    if (certificates.length === 0) {
      return res.status(404).json({ message: "Certificate not found" })
    }

    const certificateId = certificates[0].id

    // Format the date to a MySQL-compatible datetime format
    const now = new Date()
    const formattedDate = now.toISOString().slice(0, 19).replace("T", " ") // Format: YYYY-MM-DD HH:MM:SS

    // Record verification
    await db.query(
      "INSERT INTO verifications (certificate_id, verification_date, is_valid, verifier_id) VALUES (?, ?, ?, ?)",
      [certificateId, formattedDate, isValid ? 1 : 0, verifierId],
    )

    return res.status(201).json({ message: "Verification recorded successfully" })
  } catch (error) {
    console.error("Record verification error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
