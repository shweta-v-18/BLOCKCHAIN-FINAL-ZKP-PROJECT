import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await db.query("SELECT * FROM admins WHERE email = ?", [email])

    if (existingUser && existingUser.length > 0) {
      return NextResponse.json({ message: "Email already in use" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const result = await db.query("INSERT INTO admins (email, password) VALUES (?, ?)", [email, hashedPassword])

    // Set session cookie
    // In a real app, you would use a proper session management system

    return NextResponse.json({
      message: "Signup successful",
      user: {
        id: result.insertId,
        email,
      },
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
