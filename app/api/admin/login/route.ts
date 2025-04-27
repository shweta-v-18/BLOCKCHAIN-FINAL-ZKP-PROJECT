import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { comparePasswords } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    // Find admin user
    const user = await db.query("SELECT * FROM admins WHERE email = ?", [email])

    if (!user || user.length === 0) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    // Verify password
    const passwordMatch = await comparePasswords(password, user[0].password)
    if (!passwordMatch) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    // Set session cookie
    // In a real app, you would use a proper session management system

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
