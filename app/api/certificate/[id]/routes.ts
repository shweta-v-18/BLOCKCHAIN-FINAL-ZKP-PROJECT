import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import fs from "fs"
import path from "path"

// Path to blockchain data file (for simulation)
const blockchainDataPath = path.join(process.cwd(), "data", "blockchain_data.json")

export async function GET(request: Request, context: { params: { id?: string } }) {
  try {
    // Safely access the id parameter with fallback
    const certificateId = context.params?.id

    if (!certificateId) {
      return NextResponse.json({ message: "Certificate ID is required" }, { status: 400 })
    }

    console.log(`Fetching certificate with ID: ${certificateId}`)

    // First check if the certificate exists in our blockchain simulation
    let certificateExists = false
    try {
      if (fs.existsSync(blockchainDataPath)) {
        const blockchainData = JSON.parse(fs.readFileSync(blockchainDataPath, "utf8"))
        certificateExists = blockchainData.certificates.some((cert: any) => cert.hash === certificateId)

        if (certificateExists) {
          console.log(`Certificate ${certificateId} found in blockchain data`)
        } else {
          console.log(`Certificate ${certificateId} NOT found in blockchain data`)
        }
      }
    } catch (error) {
      console.error("Error checking blockchain data:", error)
    }

    // Get certificate from database
    let result
    try {
      result = await db.query(
        "SELECT c.*, s.name, s.father_name, s.degree, s.email FROM certificates c " +
          "JOIN students s ON c.student_id = s.id " +
          "WHERE c.certificate_hash = ?",
        [certificateId],
      )
    } catch (dbError) {
      console.error("Database query error:", dbError)

      // If database is not available, check if we can find it in blockchain data
      if (certificateExists) {
        return NextResponse.json({
          id: certificateId,
          studentName: "Certificate Owner", // Fallback name
          degree: "Degree from Blockchain",
          university: "Example University",
          issueDate: new Date().toISOString().split("T")[0],
          qrCodeUrl: `/api/certificate/qrcode/${certificateId}`,
          isValid: true,
        })
      }

      return NextResponse.json({ message: "Database error: " + (dbError as Error).message }, { status: 500 })
    }

    // Convert result to array if it's not already
    const certificates = Array.isArray(result) ? result : [result]

    // Check if we have any results
    if (!certificates || certificates.length === 0) {
      // If not in database but in blockchain, return minimal info
      if (certificateExists) {
        return NextResponse.json({
          id: certificateId,
          studentName: "Certificate Owner", // Fallback name
          degree: "Degree from Blockchain",
          university: "Example University",
          issueDate: new Date().toISOString().split("T")[0],
          qrCodeUrl: `/api/certificate/qrcode/${certificateId}`,
          isValid: true,
        })
      }

      return NextResponse.json({ message: "Certificate not found" }, { status: 404 })
    }

    const certificate = certificates[0]

    // Add null check for certificate_data
    let certificateData: Record<string, any> = {}
    try {
      if (certificate.certificate_data) {
        certificateData = JSON.parse(certificate.certificate_data)
      }
    } catch (error) {
      console.error("Error parsing certificate data:", error)
    }

    // Generate QR code URL
    const qrCodeUrl = `/api/certificate/qrcode/${certificateId}`

    return NextResponse.json({
      id: certificateId,
      studentName: certificate.name,
      degree: certificate.degree,
      university: "Example University", // This would come from your university settings
      issueDate: certificate.issue_date,
      joinDate: certificateData.joinDate || "",
      endDate: certificateData.endDate || "",
      academicYear: certificateData.academicYear || "",
      finalScore: certificateData.finalScore || "",
      registrationNumber: certificateData.registrationNumber || "",
      qrCodeUrl,
      certificateData,
      isValid: true, // Default to true for viewing
    })
  } catch (error) {
    console.error("Certificate retrieval error:", error)
    return NextResponse.json(
      { message: "Failed to retrieve certificate: " + (error as Error).message },
      { status: 500 },
    )
  }
}
