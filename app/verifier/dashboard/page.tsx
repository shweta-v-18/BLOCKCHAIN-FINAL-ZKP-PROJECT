"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QrCode, Search, CheckCircle, XCircle, Upload } from "lucide-react"
import VerifierNavbar from "@/components/verifier-navbar"
import { certificateApi } from "@/lib/api-client"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import jsQR from "jsqr"

interface CertificateData {
  id: string
  name: string
  degree: string
  university: string
  issueDate: string
  registrationNumber: string
  academicYear: string
  finalScore: string
  isValid: boolean
}

export default function VerifierDashboard() {
  const router = useRouter()
  const [certificateHash, setCertificateHash] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [qrScanActive, setQrScanActive] = useState(false)
  const [uploadedQrCode, setUploadedQrCode] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up video stream when component unmounts or when QR scanning is deactivated
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        const tracks = stream.getTracks()
        tracks.forEach((track) => track.stop())
      }

      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }
    }
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!certificateHash.trim()) return

    setIsVerifying(true)
    setError("")
    setSuccess("")
    setCertificateData(null)

    try {
      console.log("Verifying certificate hash:", certificateHash)
      const data = await certificateApi.verify(certificateHash)
      setCertificateData(data)

      // Set success message
      setSuccess(
        data.isValid
          ? "Certificate successfully verified! This is a valid certificate."
          : "Certificate verification completed, but this certificate is not valid.",
      )

      // If verification is successful, add to history and redirect to certificate page after a delay
      if (data.isValid) {
        setTimeout(() => {
          router.push(`/verifier/certificate/${certificateHash}`)
        }, 2000)
      }
    } catch (err: any) {
      console.error("Certificate verification error:", err)
      setError(err.message || "Certificate verification failed")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleQrCodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()

      setError("") // Clear any previous errors
      setScanResult(null) // Clear previous scan results

      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setUploadedQrCode(event.target.result as string)
        }
      }

      reader.onerror = () => {
        setError("Failed to read the uploaded file. Please try another image.")
      }

      reader.readAsDataURL(file)
    }
  }

  const startQrScanner = async () => {
    setQrScanActive(true)
    setScanResult(null)
    setError("")

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()

          // Start scanning for QR codes
          scanQrCode()
        }
      } else {
        setError("Camera access not supported by your browser")
        setQrScanActive(false)
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err)
      setError(err.message || "Failed to access camera")
      setQrScanActive(false)
    }
  }

  const stopQrScanner = () => {
    setQrScanActive(false)

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      const tracks = stream.getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }

  const scanQrCode = () => {
    if (!qrScanActive) return

    // Set up an interval to scan for QR codes
    scanIntervalRef.current = setInterval(() => {
      const video = videoRef.current
      const canvas = canvasRef.current

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const context = canvas.getContext("2d")
        if (context) {
          canvas.height = video.videoHeight
          canvas.width = video.videoWidth
          context.drawImage(video, 0, 0, canvas.width, canvas.height)

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

          try {
            // Use jsQR to detect QR codes
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            })

            if (code) {
              console.log("QR code detected:", code.data)

              // Stop scanning once we have a result
              if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current)
                scanIntervalRef.current = null
              }

              // Set the detected hash
              setScanResult(code.data)

              // Extract the hash from the URL if needed
              let hash = code.data
              if (hash.includes("/")) {
                hash = hash.split("/").pop() || hash
              }

              setCertificateHash(hash)
              stopQrScanner()

              // Automatically verify the certificate
              handleVerify({ preventDefault: () => {} } as React.FormEvent)
            }
          } catch (err) {
            console.error("QR code scanning error:", err)
          }
        }
      }
    }, 500) // Scan every 500ms
  }

  const scanUploadedQrCode = async () => {
    if (!uploadedQrCode) return

    try {
      setIsVerifying(true)
      setError("")
      setSuccess("")

      // Create an image from the uploaded QR code
      const image = new Image()
      image.src = uploadedQrCode
      image.crossOrigin = "anonymous"

      image.onload = async () => {
        // Create a canvas to draw the image
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")

        if (!context) {
          setError("Failed to process QR code")
          setIsVerifying(false)
          return
        }

        canvas.width = image.width
        canvas.height = image.height
        context.drawImage(image, 0, 0)

        // Get image data for QR code scanning
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

        try {
          // Use jsQR to detect QR codes
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          })

          if (code) {
            console.log("QR code detected from uploaded image:", code.data)

            // Set the detected hash
            setScanResult(code.data)

            // Extract the hash from the URL if needed
            let hash = code.data
            if (hash.includes("/")) {
              hash = hash.split("/").pop() || hash
            }

            setCertificateHash(hash)

            // Automatically verify the certificate
            try {
              console.log("Verifying certificate from QR code:", hash)
              const data = await certificateApi.verify(hash)
              setCertificateData(data)

              // Set success message
              setSuccess(
                data.isValid
                  ? "Certificate successfully verified! This is a valid certificate."
                  : "Certificate verification completed, but this certificate is not valid.",
              )

              // If verification is successful, redirect to certificate page after a delay
              if (data.isValid) {
                setTimeout(() => {
                  router.push(`/verifier/certificate/${hash}`)
                }, 2000)
              }
            } catch (err: any) {
              setError(err.message || "Certificate verification failed")
            }
          } else {
            setError("No QR code found in the uploaded image")
          }
        } catch (err) {
          console.error("QR code processing error:", err)
          setError("Failed to process QR code")
        }

        setIsVerifying(false)
      }

      image.onerror = () => {
        setError("Failed to load the uploaded image")
        setIsVerifying(false)
      }
    } catch (err) {
      console.error("QR code scanning error:", err)
      setError("Failed to scan QR code. Please try again or enter the certificate hash manually.")
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <VerifierNavbar />

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto bg-black border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Verify Certificate</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="hash" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-800">
                <TabsTrigger value="hash" className="data-[state=active]:bg-blue-600">
                  Enter Certificate Hash
                </TabsTrigger>
                <TabsTrigger value="qr" className="data-[state=active]:bg-blue-600">
                  Scan QR Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hash">
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter Certificate Hash ID"
                      value={certificateHash}
                      onChange={(e) => setCertificateHash(e.target.value)}
                      className="flex-1 bg-gray-800 border-gray-700 text-white"
                    />
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isVerifying}>
                      {isVerifying ? "Verifying..." : "Verify"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="qr">
                <div className="flex flex-col items-center space-y-4">
                  <div className="border border-gray-700 rounded-lg p-4 w-64 h-64 flex items-center justify-center bg-gray-800 relative">
                    {qrScanActive ? (
                      <div className="relative w-full h-full">
                        <video
                          ref={videoRef}
                          className="absolute inset-0 w-full h-full object-cover rounded-lg"
                          playsInline
                        ></video>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-48 h-48 border-2 border-blue-500 rounded-lg"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-1 bg-blue-500 opacity-50 animate-scan"></div>
                        </div>
                      </div>
                    ) : uploadedQrCode ? (
                      <img
                        src={uploadedQrCode || "/placeholder.svg"}
                        alt="Uploaded QR Code"
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    ) : (
                      <QrCode className="w-16 h-16 text-gray-400" />
                    )}

                    {/* Hidden canvas for QR code processing */}
                    <canvas ref={canvasRef} className="hidden"></canvas>
                  </div>

                  <div className="flex flex-col space-y-2 w-full">
                    {!qrScanActive && (
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-gray-700 hover:bg-gray-600 flex-1"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload QR Code
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleQrCodeUpload}
                          className="hidden"
                        />

                        {uploadedQrCode && (
                          <Button onClick={scanUploadedQrCode} className="bg-blue-600 hover:bg-blue-700">
                            <Search className="w-4 h-4 mr-2" />
                            Scan Uploaded QR
                          </Button>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={qrScanActive ? stopQrScanner : startQrScanner}
                      className={qrScanActive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      {qrScanActive ? "Stop Scanning" : "Scan with Camera"}
                    </Button>
                  </div>

                  {scanResult && (
                    <div className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md">
                      <p className="text-sm text-gray-400 mb-1">Detected Certificate Hash:</p>
                      <p className="font-mono text-xs break-all">{scanResult}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive" className="mt-6 bg-red-900 border-red-800 text-red-200">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mt-6 bg-green-900 border-green-800 text-green-200">
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {certificateData && (
              <div className="mt-6 p-6 bg-gray-800 text-white rounded-lg border border-gray-700">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold">Certificate Details</h3>
                  {certificateData.isValid ? (
                    <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm inline-flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Verified
                    </div>
                  ) : (
                    <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm inline-flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      Invalid
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-gray-400">Student Name:</p>
                    <p className="font-semibold">{certificateData.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Registration Number:</p>
                    <p className="font-semibold">{certificateData.registrationNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Degree:</p>
                    <p className="font-semibold">{certificateData.degree}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">University:</p>
                    <p className="font-semibold">{certificateData.university}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Academic Year:</p>
                    <p className="font-semibold">{certificateData.academicYear}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Date of Issue:</p>
                    <p className="font-semibold">{certificateData.issueDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Final Score:</p>
                    <p className="font-semibold">{certificateData.finalScore}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Certificate ID:</p>
                    <p className="font-mono text-xs truncate">{certificateData.id}</p>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => router.push(`/verifier/certificate/${certificateData.id}`)}
                  >
                    View Full Certificate
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
