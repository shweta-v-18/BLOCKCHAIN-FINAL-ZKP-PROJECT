import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyHashOnBlockchain } from "@/lib/blockchain"

export async function GET(request: Request, context: { params: { hash?: string } }) {
  try {
    // Safely access the hash parameter with fallback
    const certificateHash = context.params?.hash

    if (!certificateHash) {
      return NextResponse.json({ message: "Certificate hash is required" }, { status: 400 })
    }

    console.log(`Verifying certificate with hash: ${certificateHash}`)

    // Check if certificate exists in database
    let result
    try {
      result = await db.query(
        "SELECT c.*, s.name, s.father_name, s.degree, s.email FROM certificates c " +
          "JOIN students s ON c.student_id = s.id " +
          "WHERE c.certificate_hash = ?",
        [certificateHash],
      )
    } catch (dbError) {
      console.error("Database query error:", dbError)
      return NextResponse.json({ message: "Database error: " + (dbError as Error).message }, { status: 500 })
    }

    // Convert result to array if it's not already
    const certificates = Array.isArray(result) ? result : [result]

    // Check if we have any results
    if (!certificates || certificates.length === 0) {
      return NextResponse.json({ message: "Certificate not found" }, { status: 404 })
    }

    const certificate = certificates[0]

    // Add null check for certificate_data
    let certificateData: Record<string, any> = {}
    try {
      if (certificate.certificate_data) {
        certificateData = JSON.parse(certificate.certificate_data)
      }
    } catch (parseError) {
      console.error("Error parsing certificate data:", parseError)
    }

    // Verify on blockchain
    const isValid = await verifyHashOnBlockchain(certificateHash)

    // Format the date to a MySQL-compatible datetime format
    const now = new Date()
    const formattedDate = now.toISOString().slice(0, 19).replace("T", " ") // Format: YYYY-MM-DD HH:MM:SS

    // Log verification attempt
    try {
      await db.query("INSERT INTO verifications (certificate_id, verification_date, is_valid) VALUES (?, ?, ?)", [
        certificate.id,
        formattedDate,
        isValid ? 1 : 0,
      ])
    } catch (dbError) {
      console.error("Error logging verification:", dbError)
      // Continue even if logging fails
    }

    return NextResponse.json({
      id: certificateHash,
      name: certificate.name,
      degree: certificate.degree,
      university: "Example University", // This would come from your university settings
      issueDate: certificate.issue_date,
      joinDate: certificateData.joinDate || "",
      endDate: certificateData.endDate || "",
      academicYear: certificateData.academicYear || "",
      finalScore: certificateData.finalScore || "",
      registrationNumber: certificateData.registrationNumber || "",
      isValid,
      certificateData,
    })
  } catch (error) {
    console.error("Certificate verification error:", error)
    return NextResponse.json({ message: "Failed to verify certificate: " + (error as Error).message }, { status: 500 })
  }
}
