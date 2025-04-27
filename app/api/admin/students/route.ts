import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const students = await db.query("SELECT * FROM students")
    return NextResponse.json(students)
  } catch (error) {
    console.error("Error fetching students:", error)
    return NextResponse.json({ message: "Failed to fetch students" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, father_name, degree, marks, email } = await request.json()

    // Validate input
    if (!name || !email || !degree) {
      return NextResponse.json({ message: "Missing required student information" }, { status: 400 })
    }

    // Check if student already exists
    const existingStudents = await db.query("SELECT * FROM students WHERE email = ?", [email])

    if (existingStudents && existingStudents.length > 0) {
      return NextResponse.json({ message: "Student with this email already exists" }, { status: 409 })
    }

    // Create student
    const result = await db.query(
      "INSERT INTO students (name, father_name, degree, marks, email) VALUES (?, ?, ?, ?, ?)",
      [name, father_name, degree, marks, email],
    )

    return NextResponse.json({
      message: "Student registered successfully",
      studentId: result.insertId,
    })
  } catch (error) {
    console.error("Student registration error:", error)
    return NextResponse.json({ message: "Failed to register student" }, { status: 500 })
  }
}
