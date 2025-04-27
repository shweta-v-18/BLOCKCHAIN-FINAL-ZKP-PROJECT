import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    // Check authentication
    const cookieStore = cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 })
    }

    // Get verification history
    const result = await db.query(`
      SELECT v.id, v.verification_date, v.is_valid, c.certificate_hash, s.name
      FROM verifications v
      JOIN certificates c ON v.certificate_id = c.id
      JOIN students s ON c.student_id = s.id
      ORDER BY v.verification_date DESC
      LIMIT 20
    `)

    // Convert result to array if it's not already
    const rows = Array.isArray(result) ? result : [result]

    return NextResponse.json({
      verifications: rows.map((v) => ({
        id: v.id,
        date: v.verification_date,
        isValid: v.is_valid === 1,
        certificateHash: v.certificate_hash,
        studentName: v.name,
      })),
    })
  } catch (error) {
    console.error("Get verification history error:", error)
    return NextResponse.json({ message: "Failed to retrieve verification history" }, { status: 500 })
  }
}
