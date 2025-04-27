import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import { fileURLToPath } from "url"
import path from "path"

// Import routes
import adminRoutes from "./routes/admin.routes.js"
import verifierRoutes from "./routes/verifier.routes.js"
import certificateRoutes from "./routes/certificate.routes.js"
import blockchainRoutes from "./routes/blockchain.routes.js"
import { initDatabase } from "./config/db.js"
import studentRoutes from "./routes/student.routes.js"

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

// Initialize database
initDatabase()
  .then(() => console.log("Database initialized successfully"))
  .catch((err) => console.error("Database initialization error:", err))

// Routes
app.use("/api/admin", adminRoutes)
app.use("/api/verifier", verifierRoutes)
app.use("/api", certificateRoutes)
app.use("/api", blockchainRoutes)
app.use("/api", studentRoutes)

// Serve static files
const __dirname = path.dirname(fileURLToPath(import.meta.url))
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")))

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build", "index.html"))
  })
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: "Something went wrong!" })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
