import express from "express"
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from "../controllers/student.controller.js"
import { authenticate } from "../utils/auth.js"

const router = express.Router()

// Student routes
router.get("/admin/students", authenticate(["admin"]), getAllStudents)
router.get("/admin/students/:id", authenticate(["admin"]), getStudentById)
router.post("/admin/students", authenticate(["admin"]), createStudent)
router.put("/admin/students/:id", authenticate(["admin"]), updateStudent)
router.delete("/admin/students/:id", authenticate(["admin"]), deleteStudent)

export default router
