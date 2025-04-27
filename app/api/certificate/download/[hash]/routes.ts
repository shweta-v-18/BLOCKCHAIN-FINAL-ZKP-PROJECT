import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import fs from "fs"
import path from "path"
import QRCode from "qrcode"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

// Support both GET and POST methods for certificate download
export async function GET(request: Request, context: { params: { hash?: string } }) {
  return handleCertificateDownload(request, context)
}

export async function POST(request: Request, context: { params: { hash?: string } }) {
  return handleCertificateDownload(request, context)
}

// Common handler function for both GET and POST
async function handleCertificateDownload(request: Request, context: { params: { hash?: string } }) {
  try {
    // Safely access the hash parameter with fallback
    const certificateHash = context.params?.hash

    if (!certificateHash) {
      return NextResponse.json({ message: "Certificate hash is required" }, { status: 400 })
    }

    console.log(`Generating certificate PDF for hash: ${certificateHash}`)

    // Get certificate from database
    let certificate
    try {
      const result = await db.query(
        `SELECT c.*, s.name, s.father_name, s.degree, s.email 
         FROM certificates c 
         JOIN students s ON c.student_id = s.id 
         WHERE c.certificate_hash = ?`,
        [certificateHash],
      )

      // Convert result to array if it's not already
      const certificates = Array.isArray(result) ? result : [result]

      // Check if we have any results
      if (!certificates || certificates.length === 0) {
        console.log(`Certificate not found in database: ${certificateHash}`)
        // Try to get certificate from blockchain data
        certificate = await getCertificateFromBlockchain(certificateHash)

        if (!certificate) {
          return NextResponse.json({ message: "Certificate not found" }, { status: 404 })
        }
      } else {
        certificate = certificates[0]
      }
    } catch (dbError) {
      console.error("Database error:", dbError)
      // Try to get certificate from blockchain data as fallback
      certificate = await getCertificateFromBlockchain(certificateHash)

      if (!certificate) {
        return NextResponse.json({ message: "Failed to retrieve certificate" }, { status: 500 })
      }
    }

    // Add null check for certificate_data
    let certificateData: Record<string, any> = {}
    try {
      if (certificate.certificate_data) {
        certificateData = JSON.parse(certificate.certificate_data)
      }
    } catch (parseError) {
      console.error("Error parsing certificate data:", parseError)
    }

    // Check if there's an existing certificate file
    if (
      certificate.certificate_file &&
      fs.existsSync(path.join(process.cwd(), "public", certificate.certificate_file))
    ) {
      // If there's an existing file, serve it
      const filePath = path.join(process.cwd(), "public", certificate.certificate_file)
      const fileBuffer = fs.readFileSync(filePath)

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="certificate-${certificateHash.substring(0, 8)}.pdf"`,
        },
      })
    }

    // Otherwise, generate a new PDF certificate
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([842, 595]) // A4 landscape

    // Add university logo or name
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Title
    page.drawText("CERTIFICATE OF ACHIEVEMENT", {
      x: 250,
      y: 500,
      size: 24,
      font: titleFont,
      color: rgb(0, 0.3, 0.6),
    })

    // Certificate content
    page.drawText("This is to certify that", {
      x: 300,
      y: 450,
      size: 12,
      font: regularFont,
    })

    page.drawText(certificate.name || "Student Name", {
      x: 300,
      y: 420,
      size: 18,
      font: font,
      color: rgb(0, 0, 0),
    })

    page.drawText(`has successfully completed the requirements for`, {
      x: 250,
      y: 390,
      size: 12,
      font: regularFont,
    })

    page.drawText(certificate.degree || "Degree Program", {
      x: 300,
      y: 360,
      size: 16,
      font: font,
      color: rgb(0, 0, 0),
    })

    // Add registration number if available
    if (certificateData.registrationNumber) {
      page.drawText(`Registration Number: ${certificateData.registrationNumber}`, {
        x: 300,
        y: 330,
        size: 12,
        font: regularFont,
      })
    }

    // Add academic year if available
    if (certificateData.academicYear) {
      page.drawText(`Academic Year: ${certificateData.academicYear}`, {
        x: 300,
        y: 310,
        size: 12,
        font: regularFont,
      })
    }

    // Add final score if available
    if (certificateData.finalScore) {
      page.drawText(`Final Score: ${certificateData.finalScore}`, {
        x: 300,
        y: 290,
        size: 12,
        font: regularFont,
      })
    }

    page.drawText(`Date of Issue: ${certificate.issue_date || new Date().toISOString().split("T")[0]}`, {
      x: 300,
      y: 270,
      size: 12,
      font: regularFont,
    })

    // Generate QR code for verification
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const verificationUrl = `${appUrl}/verifier/certificate/${certificateHash}`

    // Create QR code
    let qrCodeDataUrl
    try {
      qrCodeDataUrl = await QRCode.toDataURL(verificationUrl)
      const qrCodeImage = await pdfDoc.embedPng(qrCodeDataUrl)

      page.drawImage(qrCodeImage, {
        x: 650,
        y: 250,
        width: 100,
        height: 100,
      })

      page.drawText("Scan to verify", {
        x: 665,
        y: 240,
        size: 10,
        font: regularFont,
      })
    } catch (qrError) {
      console.error("QR code generation error:", qrError)
      // Continue without QR code if there's an error
    }

    page.drawText("Certificate ID:", {
      x: 650,
      y: 220,
      size: 8,
      font: regularFont,
    })

    page.drawText(certificateHash.substring(0, 16) + "...", {
      x: 650,
      y: 210,
      size: 8,
      font: regularFont,
    })

    // Add ZKP information
    page.drawText("Verified with Zero-Knowledge Proof", {
      x: 250,
      y: 170,
      size: 10,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    })

    // Footer
    page.drawText("This certificate is secured using blockchain technology and can be verified online.", {
      x: 250,
      y: 150,
      size: 10,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    })

    // Signature placeholder
    page.drawText("____________________", {
      x: 300,
      y: 200,
      size: 12,
      font: regularFont,
    })

    page.drawText("Authorized Signature", {
      x: 310,
      y: 180,
      size: 10,
      font: regularFont,
    })

    // Save the PDF
    const pdfBytes = await pdfDoc.save()

    // Return the PDF
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificate-${certificateHash.substring(0, 8)}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Certificate download error:", error)
    return NextResponse.json({ message: "Failed to generate certificate" }, { status: 500 })
  }
}

// Helper function to get certificate from blockchain data
async function getCertificateFromBlockchain(hash: string) {
  try {
    const blockchainDataPath = path.join(process.cwd(), "data", "blockchain_data.json")

    if (fs.existsSync(blockchainDataPath)) {
      const data = JSON.parse(fs.readFileSync(blockchainDataPath, "utf8"))
      const certificate = data.certificates.find((cert: any) => cert.hash === hash)

      if (certificate) {
        return {
          name: "Certificate Owner",
          degree: "Degree from Blockchain",
          issue_date: new Date().toISOString().split("T")[0],
          certificate_data: JSON.stringify({
            registrationNumber: "BC-" + hash.substring(0, 8),
            academicYear: new Date().getFullYear().toString(),
            finalScore: "N/A",
          }),
        }
      }
    }

    return null
  } catch (error) {
    console.error("Error getting certificate from blockchain:", error)
    return null
  }
}
