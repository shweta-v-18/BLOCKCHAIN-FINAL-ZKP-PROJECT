"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download, Share2 } from "lucide-react"
import VerifierNavbar from "@/components/verifier-navbar"
import { certificateApi } from "@/lib/api-client"

interface Certificate {
  id: string
  studentName: string
  degree: string
  university: string
  issueDate: string
  qrCodeUrl: string
}

export default function CertificateView({ params }: { params: { id: string } }) {
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        setLoading(true)
        const data = await certificateApi.getCertificate(params.id)
        setCertificate({
          id: params.id,
          studentName: data.studentName,
          degree: data.degree,
          university: data.university,
          issueDate: data.issueDate,
          qrCodeUrl: certificateApi.getQrCodeUrl(params.id),
        })
      } catch (err: any) {
        setError(err.message || "Failed to load certificate")
      } finally {
        setLoading(false)
      }
    }

    fetchCertificate()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading certificate...</p>
      </div>
    )
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error || "Certificate not found"}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VerifierNavbar />

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-0">
            <div className="bg-white p-8 rounded-t-lg">
              <div className="flex justify-between items-start mb-6">
                <h1 className="text-2xl font-bold">Certificate of Achievement</h1>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-full max-w-md border border-gray-200 rounded-lg overflow-hidden">
                  <Image
                    src="/placeholder.svg?height=400&width=600"
                    alt="Certificate"
                    width={600}
                    height={400}
                    className="w-full"
                  />
                </div>

                <div className="mt-8 text-center">
                  <h2 className="text-xl font-semibold">{certificate.studentName}</h2>
                  <p className="text-gray-600 mt-2">has successfully completed the requirements for</p>
                  <p className="text-xl font-bold mt-2">{certificate.degree}</p>
                  <p className="text-gray-600 mt-2">from</p>
                  <p className="text-lg font-semibold mt-1">{certificate.university}</p>
                  <p className="text-gray-600 mt-4">Issued on: {certificate.issueDate}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-600 text-white p-4 rounded-b-lg text-center">
              <p className="mb-2">Scan to verify on blockchain</p>
              <div className="flex justify-center">
                <Image
                  src={certificate.qrCodeUrl || "/placeholder.svg"}
                  alt="QR Code"
                  width={120}
                  height={120}
                  className="bg-white p-2 rounded-md"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
