import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d"

// Hash password
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

// Compare password with hash
export const comparePasswords = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword)
}

// Generate JWT token
export const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

// Authentication middleware
export const authenticate = (roles = []) => {
  return (req, res, next) => {
    console.log("Authentication check for path:", req.path)
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if (!token) {
      console.log("No authentication token found")
      return res.status(401).json({ message: "Authentication required" })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      console.log("Invalid or expired token")
      return res.status(401).json({ message: "Invalid or expired token" })
    }

    // Check if user has required role
    if (roles.length && !roles.includes(decoded.role)) {
      console.log("Access denied - user role:", decoded.role, "required roles:", roles)
      return res.status(403).json({ message: "Access denied" })
    }

    console.log("Authentication successful for user:", decoded.id, "role:", decoded.role)
    req.user = decoded
    next()
  }
}
