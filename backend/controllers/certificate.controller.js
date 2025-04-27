import { db } from "../config/db.js"
import { createCertificateHash, storeHashOnBlockchain, verifyHashOnBlockchain } from "../utils/blockchain.js"
import QRCode from "qrcode"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import multer from "multer"

// First, import the ZKP utilities at the top
import { createCommitment, generateProof, generateSalt } from "../utils/zkp.js"

// Get directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads")
const certificatesDir = path.join(uploadsDir, "certificates")
const qrcodesDir = path.join(uploadsDir, "qrcodes")

// More robust directory creation
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`Created directory: ${dir}`)
    } catch (err) {
      console.error(`Error creating directory ${dir}:`, err)
    }
  }
}

createDirIfNotExists(uploadsDir)
createDirIfNotExists(certificatesDir)
createDirIfNotExists(qrcodesDir)

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, certificatesDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + "-" + uniqueSuffix + ext)
  },
})

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (ext && mimetype) {
      return cb(null, true)
    }
    cb(new Error("Only .jpeg, .jpg, .png, and .pdf files are allowed"))
  },
})

// Issue a new certificate
export const issueCertificate = async (req, res) => {
  try {
    console.log("Certificate issuance request received:", {
      body: req.body,
      file: req.file,
      path: req.path,
      method: req.method,
    })

    const { studentId, studentName, department, registrationNumber, joinDate, endDate, academicYear, finalScore } =
      req.body

    // Validate input
    if (!studentName || !department || !registrationNumber) {
      return res.status(400).json({ message: "Missing required certificate information" })
    }

    // Get student details or create a new student if studentId is not provided
    let student
    if (studentId) {
      const students = await db.query("SELECT * FROM students WHERE id = ?", [studentId])
      if (students.length === 0) {
        return res.status(404).json({ message: "Student not found" })
      }
      student = students[0]
    } else {
      // Create a new student
      const result = await db.query("INSERT INTO students (name, degree, email) VALUES (?, ?, ?)", [
        studentName,
        department,
        `${studentName.replace(/\s+/g, ".").toLowerCase()}@example.com`,
      ])
      student = {
        id: result.insertId,
        name: studentName,
        degree: department,
      }
    }

    // Handle certificate file if uploaded
    let certificateFilePath = null
    if (req.file) {
      certificateFilePath = `/uploads/certificates/${req.file.filename}`
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

    // Generate hash and ZK proof
    const certificateHash = createCertificateHash(certificateData)
    const salt = generateSalt()
    const zkProof = generateProof(certificateData, salt)

    // Store in database including ZKP data
    const issueDate = new Date().toISOString().split("T")[0]
    const result = await db.query(
      "INSERT INTO certificates (student_id, certificate_hash, issue_date, certificate_data, certificate_file) VALUES (?, ?, ?, ?, ?)",
      [
        student.id,
        certificateHash,
        issueDate,
        JSON.stringify({
          ...certificateData,
          zkpData: {
            salt,
            publicSignals: zkProof.publicSignals,
          },
        }),
        certificateFilePath,
      ],
    )

    // Generate QR code
    const appUrl = process.env.FRONTEND_URL || "http://localhost:3000"
    const verificationUrl = `${appUrl}/verifier/certificate/${certificateHash}`
    const qrCodePath = path.join(qrcodesDir, `${certificateHash}.png`)

    try {
      await QRCode.toFile(qrCodePath, verificationUrl)
      console.log(`QR code generated and saved to ${qrCodePath}`)
    } catch (qrError) {
      console.error("Error generating QR code:", qrError)
      // Continue with the process even if QR code generation fails
    }

    // Store on blockchain with ZKP
    const txnId = await storeHashOnBlockchain(certificateHash, certificateData)

    return res.status(201).json({
      message: "Certificate issued successfully",
      certificateId: result.insertId,
      certificateHash,
      blockchainTxnId: txnId,
      qrCodeUrl: `/api/qrcode/${certificateHash}`,
    })
  } catch (error) {
    console.error("Issue certificate error:", error)
    return res.status(500).json({ message: "Failed to issue certificate" })
  }
}

// Get certificate by hash
export const getCertificateByHash = async (req, res) => {
  try {
    const { hash } = req.params

    // Get certificate from database
    const certificates = await db.query(
      `SELECT c.*, s.name, s.father_name, s.degree, s.email 
       FROM certificates c 
       JOIN students s ON c.student_id = s.id 
       WHERE c.certificate_hash = ?`,
      [hash],
    )

    if (certificates.length === 0) {
      return res.status(404).json({ message: "Certificate not found" })
    }

    const certificate = certificates[0]
    const certificateData = JSON.parse(certificate.certificate_data)

    // Generate QR code URL
    const qrCodeUrl = `/api/qrcode/${hash}`

    // Verify on blockchain
    const isValid = await verifyHashOnBlockchain(hash)

    return res.status(200).json({
      id: hash,
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
      certificateFileUrl: certificate.certificate_file,
      certificateData,
      isValid,
    })
  } catch (error) {
    console.error("Get certificate error:", error)
    return res.status(500).json({ message: "Failed to retrieve certificate" })
  }
}

// Verify certificate
export const verifyCertificate = async (req, res) => {
  try {
    const { hash } = req.params

    // Check if certificate exists in database
    const certificates = await db.query(
      `SELECT c.*, s.name, s.father_name, s.degree, s.email 
       FROM certificates c 
       JOIN students s ON c.student_id = s.id 
       WHERE c.certificate_hash = ?`,
      [hash],
    )

    if (certificates.length === 0) {
      return res.status(404).json({ message: "Certificate not found" })
    }

    const certificate = certificates[0]

    // Verify on blockchain with ZKP
    const certificateData = JSON.parse(certificate.certificate_data)
    const zkpData = certificateData.zkpData || {}

    // In a real ZKP system, we would verify the proof here
    // For our simulation, we'll just check if the data exists
    const isValid = await verifyHashOnBlockchain(hash, {
      zkProof: {
        publicSignals: zkpData.publicSignals || [],
      },
      certificateCommitment: createCommitment(certificateData, zkpData.salt || ""),
    })

    // Format the date to a MySQL-compatible datetime format
    const now = new Date()
    const formattedDate = now.toISOString().slice(0, 19).replace("T", " ") // Format: YYYY-MM-DD HH:MM:SS

    // Log verification attempt
    await db.query("INSERT INTO verifications (certificate_id, verification_date, is_valid) VALUES (?, ?, ?)", [
      certificate.id,
      formattedDate,
      isValid ? 1 : 0,
    ])

    return res.status(200).json({
      id: hash,
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
    return res.status(500).json({ message: "Failed to verify certificate" })
  }
}

// Generate QR code for certificate
export const generateQRCode = async (req, res) => {
  try {
    const { hash } = req.params

    // Check if certificate exists
    const certificates = await db.query("SELECT * FROM certificates WHERE certificate_hash = ?", [hash])
    if (certificates.length === 0) {
      return res.status(404).json({ message: "Certificate not found" })
    }

    // Check if QR code file exists
    const qrCodePath = path.join(qrcodesDir, `${hash}.png`)

    if (!fs.existsSync(qrCodePath)) {
      // Create verification URL
      const appUrl = process.env.FRONTEND_URL || "http://localhost:3000"
      const verificationUrl = `${appUrl}/verifier/certificate/${hash}`

      // Generate QR code
      await QRCode.toFile(qrCodePath, verificationUrl)
    }

    // Read QR code file
    const qrCodeBuffer = fs.readFileSync(qrCodePath)

    // Set response headers
    res.setHeader("Content-Type", "image/png")
    res.setHeader("Content-Length", qrCodeBuffer.length)

    // Send QR code
    return res.send(qrCodeBuffer)
  } catch (error) {
    console.error("QR code generation error:", error)
    return res.status(500).json({ message: "Failed to generate QR code" })
  }
}

// Serve certificate files
export const getCertificateFile = async (req, res) => {
  try {
    const { filename } = req.params
    const filePath = path.join(certificatesDir, filename)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" })
    }

    res.sendFile(filePath)
  } catch (error) {
    console.error("File serving error:", error)
    return res.status(500).json({ message: "Failed to serve file" })
  }
}

// Get all certificates
export const getAllCertificates = async (req, res) => {
  try {
    const certificates = await db.query(
      `SELECT c.id, c.certificate_hash, c.issue_date, s.name, s.degree
       FROM certificates c
       JOIN students s ON c.student_id = s.id
       ORDER BY c.issue_date DESC`,
    )

    return res.status(200).json(certificates)
  } catch (error) {
    console.error("Get all certificates error:", error)
    return res.status(500).json({ message: "Failed to retrieve certificates" })
  }
}
