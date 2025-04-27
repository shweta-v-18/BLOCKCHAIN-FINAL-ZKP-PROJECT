import express from "express"
import { register, login, logout, getProfile, getVerificationHistory } from "../controllers/verifier.controller.js"
import { authenticate } from "../utils/auth.js"

const router = express.Router()

// Auth routes
router.post("/signup", register)
router.post("/login", login)
router.post("/logout", logout)
router.get("/profile", authenticate(["verifier"]), getProfile)

// Verification history
router.get("/history", authenticate(["verifier"]), getVerificationHistory)

export default router
