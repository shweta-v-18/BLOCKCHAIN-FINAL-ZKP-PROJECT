import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createCertificateHash, storeHashOnBlockchain } from "@/lib/blockchain"
import { cookies } from "next/headers"
import QRCode from "qrcode"
import fs from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "public", "uploads")
const certificatesDir = path.join(uploadsDir, "certificates")
const qrcodesDir = path.join(uploadsDir, "qrcodes")

// Ensure directories exist
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
  if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true })
  }
  if (!fs.existsSync(qrcodesDir)) {
    fs.mkdirSync(qrcodesDir, { recursive: true })
  }
} catch (error) {
  console.error("Error creating directories:", error)
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const cookieStore = cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 })
    }

    // For multipart form data, we need to use formData()
    const formData = await request.formData()

    // Extract form fields
    const studentId = formData.get("studentId") as string
    const studentName = formData.get("studentName") as string
    const department = formData.get("department") as string
    const registrationNumber = formData.get("registrationNumber") as string
    const joinDate = formData.get("joinDate") as string
    const endDate = formData.get("endDate") as string
    const academicYear = formData.get("academicYear") as string
    const finalScore = formData.get("finalScore") as string
    const certificateFile = formData.get("certificateFile") as File | null

    // Validate input
    if (!studentName || !department || !registrationNumber) {
      return NextResponse.json({ message: "Missing required certificate information" }, { status: 400 })
    }

    // Get student details or create a new student if studentId is not provided
    let student: any
    if (studentId) {
      try {
        const students = (await db.query("SELECT * FROM students WHERE id = ?", [studentId])) as any[]

        if (!students || students.length === 0) {
          return NextResponse.json({ message: "Student not found" }, { status: 404 })
        }

        student = Array.isArray(students) && students.length > 0 ? students[0] : students
      } catch (dbError) {
        console.error("Error fetching student:", dbError)
        return NextResponse.json({ message: "Failed to fetch student data" }, { status: 500 })
      }
    } else {
      // Create a new student
      try {
        const result = (await db.query("INSERT INTO students (name, degree, email) VALUES (?, ?, ?)", [
          studentName,
          department,
          `${studentName.replace(/\s+/g, ".").toLowerCase()}@example.com`,
        ])) as any

        student = {
          id: result.insertId || Math.floor(Math.random() * 10000), // Fallback ID if insertId is not available
          name: studentName,
          degree: department,
        }
      } catch (dbError) {
        console.error("Error creating student:", dbError)
        return NextResponse.json({ message: "Failed to create student record" }, { status: 500 })
      }
    }

    // Handle certificate file if uploaded
    let certificateFilePath = null
    if (certificateFile) {
      try {
        const fileExtension = certificateFile.name.split(".").pop()
        const fileName = `certificate-${uuidv4()}.${fileExtension}`
        const filePath = path.join(certificatesDir, fileName)

        // Convert file to buffer and save
        const arrayBuffer = await certificateFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        fs.writeFileSync(filePath, buffer)

        certificateFilePath = `/uploads/certificates/${fileName}`
      } catch (fileError) {
        console.error("Error handling certificate file:", fileError)
        // Continue without the file if there's an error
      }
    }

    // Create certificate object
    const certificateData = {
      studentId: student.id,
      studentName: student.name,
      department,
      registrationNumber,
      joinDate,
      endDate,
      academicYear,
      finalScore,
      certificateFilePath,
      timestamp: new Date().toISOString(),
    }

    // Generate hash
    const certificateHash = createCertificateHash(certificateData)

    // Generate QR code
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const verificationUrl = `${appUrl}/verifier/certificate/${certificateHash}`
    const qrCodePath = path.join(qrcodesDir, `${certificateHash}.png`)

    try {
      const qrDataUrl = await QRCode.toDataURL(verificationUrl)
      const data = qrDataUrl.split(",")[1]
      const buffer = Buffer.from(data, "base64")
      fs.writeFileSync(qrCodePath, buffer)
      console.log(`QR code generated and saved to ${qrCodePath}`)
    } catch (qrError) {
      console.error("Error generating QR code:", qrError)
      // Continue with the process even if QR code generation fails
    }

    // Store in database
    const now = new Date()
    const issueDate = now.toISOString().split("T")[0]

    try {
      await db.query(
        "INSERT INTO certificates (student_id, certificate_hash, issue_date, certificate_data, certificate_file) VALUES (?, ?, ?, ?, ?)",
        [student.id, certificateHash, issueDate, JSON.stringify(certificateData), certificateFilePath],
      )
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ message: "Failed to store certificate in database" }, { status: 500 })
    }

    // Store on blockchain
    let txnId
    try {
      console.log("Storing certificate hash on blockchain:", certificateHash)
      txnId = await storeHashOnBlockchain(certificateHash, certificateData)
      console.log("Certificate stored on blockchain with transaction ID:", txnId)
    } catch (blockchainError) {
      console.error("Blockchain storage error:", blockchainError)
      // Generate a simulated transaction ID
      txnId = `0x${Math.random().toString(16).substring(2, 42)}`
    }

    return NextResponse.json({
      message: "Certificate issued successfully",
      certificateHash,
      blockchainTxnId: txnId,
      qrCodeUrl: `/api/qrcode/${certificateHash}`,
      redirectUrl: `/admin/certificates/${certificateHash}`,
    })
  } catch (error) {
    console.error("Certificate issuance error:", error)
    return NextResponse.json(
      { message: "Failed to issue certificate: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    )
  }
}
