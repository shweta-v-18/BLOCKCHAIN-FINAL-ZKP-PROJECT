import { db } from "../config/db.js"

// Get all students
export const getAllStudents = async (req, res) => {
  try {
    const students = await db.query("SELECT * FROM students ORDER BY name")
    return res.status(200).json(students)
  } catch (error) {
    console.error("Get all students error:", error)
    return res.status(500).json({ message: "Failed to retrieve students" })
  }
}

// Get student by ID
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params
    const students = await db.query("SELECT * FROM students WHERE id = ?", [id])

    if (students.length === 0) {
      return res.status(404).json({ message: "Student not found" })
    }

    return res.status(200).json(students[0])
  } catch (error) {
    console.error("Get student error:", error)
    return res.status(500).json({ message: "Failed to retrieve student" })
  }
}

// Create new student
export const createStudent = async (req, res) => {
  try {
    const { name, father_name, degree, email, marks } = req.body

    // Validate input
    if (!name || !degree || !email) {
      return res.status(400).json({ message: "Missing required student information" })
    }

    // Check if email already exists
    const existingStudents = await db.query("SELECT * FROM students WHERE email = ?", [email])
    if (existingStudents.length > 0) {
      return res.status(409).json({ message: "Student with this email already exists" })
    }

    // Insert new student
    const result = await db.query(
      "INSERT INTO students (name, father_name, degree, email, marks) VALUES (?, ?, ?, ?, ?)",
      [name, father_name || null, degree, email, marks || null],
    )

    return res.status(201).json({
      id: result.insertId,
      name,
      father_name,
      degree,
      email,
      marks,
    })
  } catch (error) {
    console.error("Create student error:", error)
    return res.status(500).json({ message: "Failed to create student" })
  }
}

// Update student
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params
    const { name, father_name, degree, email, marks } = req.body

    // Validate input
    if (!name || !degree || !email) {
      return res.status(400).json({ message: "Missing required student information" })
    }

    // Check if student exists
    const students = await db.query("SELECT * FROM students WHERE id = ?", [id])
    if (students.length === 0) {
      return res.status(404).json({ message: "Student not found" })
    }

    // Check if email already exists for another student
    const existingStudents = await db.query("SELECT * FROM students WHERE email = ? AND id != ?", [email, id])
    if (existingStudents.length > 0) {
      return res.status(409).json({ message: "Another student with this email already exists" })
    }

    // Update student
    await db.query("UPDATE students SET name = ?, father_name = ?, degree = ?, email = ?, marks = ? WHERE id = ?", [
      name,
      father_name || null,
      degree,
      email,
      marks || null,
      id,
    ])

    return res.status(200).json({
      id,
      name,
      father_name,
      degree,
      email,
      marks,
    })
  } catch (error) {
    console.error("Update student error:", error)
    return res.status(500).json({ message: "Failed to update student" })
  }
}

// Delete student
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params

    // Check if student exists
    const students = await db.query("SELECT * FROM students WHERE id = ?", [id])
    if (students.length === 0) {
      return res.status(404).json({ message: "Student not found" })
    }

    // Check if student has certificates
    const certificates = await db.query("SELECT * FROM certificates WHERE student_id = ?", [id])
    if (certificates.length > 0) {
      return res.status(409).json({ message: "Cannot delete student with existing certificates" })
    }

    // Delete student
    await db.query("DELETE FROM students WHERE id = ?", [id])

    return res.status(200).json({ message: "Student deleted successfully" })
  } catch (error) {
    console.error("Delete student error:", error)
    return res.status(500).json({ message: "Failed to delete student" })
  }
}
