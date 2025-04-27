"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Download, Share2 } from "lucide-react"
import AdminNavbar from "@/components/admin-navbar"
import { certificateApi } from "@/lib/api-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface CertificateData {
  id: string
  studentName: string
  degree: string
  university: string
  issueDate: string
  joinDate: string
  endDate: string
  academicYear: string
  finalScore: string
  registrationNumber: string
  qrCodeUrl: string
  certificateFileUrl: string
  isValid: boolean
}

export default function CertificateViewPage() {
  const params = useParams()
  const hash = params.hash as string

  const [certificate, setCertificate] = useState<CertificateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        setLoading(true)
        const data = await certificateApi.getCertificate(hash)
        setCertificate(data)

        // Set the QR code URL with the full path and a timestamp to prevent caching
        setQrCodeUrl(`/api/qrcode/${hash}?t=${Date.now()}`)

        console.log("Certificate data:", data)
      } catch (err: any) {
        console.error("Failed to fetch certificate:", err)
        setError(err.message || "Failed to fetch certificate")
      } finally {
        setLoading(false)
      }
    }

    if (hash) {
      fetchCertificate()
    }
  }, [hash])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Certificate for ${certificate?.studentName}`,
        text: `View certificate for ${certificate?.studentName} from ${certificate?.university}`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  const handleDownload = () => {
    window.open(`/api/certificate/download/${hash}`, "_blank")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center">Loading certificate data...</p>
        </main>
      </div>
    )
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-3xl mx-auto">
            <CardContent className="pt-6">
              <Alert variant="destructive">
                <AlertTitle>Certificate Retrieval Failed</AlertTitle>
                <AlertDescription>{error || "Certificate not found or invalid"}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold">{certificate.university}</h1>
                <p className="text-gray-500">Certificate Details</p>
              </div>
              <Badge className="bg-green-500 text-white px-3 py-1 text-sm flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Verified
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-4">Student Information</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-gray-500">Student Name:</p>
                      <p className="font-semibold">{certificate.studentName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Registration Number:</p>
                      <p className="font-semibold">{certificate.registrationNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Degree:</p>
                      <p className="font-semibold">{certificate.degree}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-4">Certificate Details</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-gray-500">Academic Year:</p>
                      <p className="font-semibold">{certificate.academicYear}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Join Date:</p>
                      <p className="font-semibold">{certificate.joinDate}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">End Date:</p>
                      <p className="font-semibold">{certificate.endDate}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Final Score:</p>
                      <p className="font-semibold">{certificate.finalScore}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date of Issue:</p>
                      <p className="font-semibold">{certificate.issueDate}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  {/* Use next/image with proper error handling */}
                  {qrCodeUrl ? (
                    <Image
                      src={qrCodeUrl || "/placeholder.svg"}
                      alt="Certificate QR Code"
                      width={200}
                      height={200}
                      priority
                      onError={(e) => {
                        console.error("QR code image failed to load:", e)
                        // Set a fallback image
                        ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=200&width=200"
                      }}
                    />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-200">
                      <p className="text-gray-500 text-sm">QR Code not available</p>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Certificate ID:</p>
                  <p className="font-mono text-xs break-all bg-gray-100 p-2 rounded">{certificate.id}</p>
                </div>
                <div className="flex space-x-2">
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Certificate
                  </Button>
                  <Button variant="outline" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
