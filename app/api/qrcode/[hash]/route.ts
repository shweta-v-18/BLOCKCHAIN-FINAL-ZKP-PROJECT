import { NextResponse } from "next/server"
import QRCode from "qrcode"
import fs from "fs"
import path from "path"

export async function GET(request: Request, context: { params: { hash?: string } }) {
  try {
    // Safely access the hash parameter with fallback
    const certificateHash = context.params?.hash

    if (!certificateHash) {
      return NextResponse.json({ message: "Certificate hash is required" }, { status: 400 })
    }

    console.log(`Generating QR code for hash: ${certificateHash}`)

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    const qrcodesDir = path.join(uploadsDir, "qrcodes")

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    if (!fs.existsSync(qrcodesDir)) {
      fs.mkdirSync(qrcodesDir, { recursive: true })
    }

    // Path to QR code file
    const qrCodePath = path.join(qrcodesDir, `${certificateHash}.png`)

    // Always regenerate the QR code to ensure it's correct
    // Create verification URL - make sure to use the correct hash
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const verificationUrl = `${appUrl}/verifier/certificate/${certificateHash}`

    console.log(`Creating QR code with URL: ${verificationUrl}`)

    // Generate QR code
    await QRCode.toFile(qrCodePath, verificationUrl)
    console.log(`QR code generated and saved to ${qrCodePath}`)

    // Read QR code file
    const qrCodeBuffer = fs.readFileSync(qrCodePath)

    // Return QR code image with cache control headers to prevent caching
    return new NextResponse(qrCodeBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": qrCodeBuffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate", // Prevent caching
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("QR code generation error:", error)

    // Generate a fallback QR code in memory if file operations fail
    try {
      const certificateHash = context.params?.hash // Ensure certificateHash is defined in this scope
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const verificationUrl = `${appUrl}/verifier/certificate/${certificateHash}`

      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl)
      const qrCodeBase64 = qrCodeDataUrl.split(",")[1]
      const qrCodeBuffer = Buffer.from(qrCodeBase64, "base64")

      return new NextResponse(qrCodeBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Content-Length": qrCodeBuffer.length.toString(),
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
    } catch (fallbackError) {
      console.error("Fallback QR code generation failed:", fallbackError)
      return NextResponse.json({ message: "Failed to generate QR code" }, { status: 500 })
    }
  }
}
