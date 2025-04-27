import express from "express"
import { register, login, logout, getProfile, getDashboardData } from "../controllers/admin.controller.js"
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from "../controllers/student.controller.js"
import { authenticate } from "../utils/auth.js"

const router = express.Router()

// Auth routes
router.post("/signup", register)
router.post("/login", login)
router.post("/logout", logout)
router.get("/profile", authenticate(["admin"]), getProfile)

// Dashboard route
router.get("/dashboard", authenticate(["admin"]), getDashboardData)

// Student routes
router.get("/students", authenticate(["admin"]), getAllStudents)
router.get("/students/:id", authenticate(["admin"]), getStudentById)
router.post("/students", authenticate(["admin"]), createStudent)
router.put("/students/:id", authenticate(["admin"]), updateStudent)
router.delete("/students/:id", authenticate(["admin"]), deleteStudent)

export default router
