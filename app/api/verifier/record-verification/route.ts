import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    // Check authentication
    const cookieStore = cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 })
    }

    // Get request body
    const { certificateHash, isValid } = await request.json()

    if (!certificateHash) {
      return NextResponse.json({ message: "Certificate hash is required" }, { status: 400 })
    }

    // Get certificate ID from hash
    const result = await db.query("SELECT id FROM certificates WHERE certificate_hash = ?", [certificateHash])

    // Convert result to array if it's not already
    const certificates = Array.isArray(result) ? result : [result]

    // Check if we have any results
    if (!certificates || certificates.length === 0) {
      return NextResponse.json({ message: "Certificate not found" }, { status: 404 })
    }

    // Safely access the id property
    const certificateId = certificates[0]?.id

    if (!certificateId) {
      return NextResponse.json({ message: "Certificate ID not found" }, { status: 404 })
    }

    // Format the date to a MySQL-compatible datetime format
    const now = new Date()
    const formattedDate = now.toISOString().slice(0, 19).replace("T", " ") // Format: YYYY-MM-DD HH:MM:SS

    // Record verification
    await db.query("INSERT INTO verifications (certificate_id, verification_date, is_valid) VALUES (?, ?, ?)", [
      certificateId,
      formattedDate,
      isValid ? 1 : 0,
    ])

    return NextResponse.json({ message: "Verification recorded successfully" })
  } catch (error) {
    console.error("Record verification error:", error)
    return NextResponse.json({ message: "Failed to record verification" }, { status: 500 })
  }
}
