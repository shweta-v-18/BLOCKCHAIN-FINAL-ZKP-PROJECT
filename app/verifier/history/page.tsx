"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Eye, Download } from "lucide-react"
import VerifierNavbar from "@/components/verifier-navbar"
import { verifierApi } from "@/lib/api-client"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface VerificationRecord {
  id: number
  date: string
  isValid: boolean
  certificateHash: string
  studentName: string
}

export default function VerificationHistory() {
  const router = useRouter()
  const [verifications, setVerifications] = useState<VerificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchVerificationHistory = async () => {
      try {
        setLoading(true)
        const data = await verifierApi.getHistory()
        setVerifications(data.verifications || [])
      } catch (err: any) {
        console.error("Failed to fetch verification history:", err)
        setError(err.message || "Failed to fetch verification history")
      } finally {
        setLoading(false)
      }
    }

    fetchVerificationHistory()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <VerifierNavbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center">Loading verification history...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VerifierNavbar />

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Verification History</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {verifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No verification records found</p>
                <p className="text-gray-400 text-sm mt-2">
                  Verification records will appear here after you verify certificates
                </p>
                <Button
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={() => router.push("/verifier/dashboard")}
                >
                  Verify a Certificate
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Certificate ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{record.studentName}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {record.certificateHash.substring(0, 8)}...
                        {record.certificateHash.substring(record.certificateHash.length - 8)}
                      </TableCell>
                      <TableCell>
                        {record.isValid ? (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Invalid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-500 hover:text-blue-700"
                            onClick={() => router.push(`/verifier/certificate/${record.certificateHash}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-500 hover:text-green-700"
                            onClick={() => window.open(`/api/certificate/download/${record.certificateHash}`, "_blank")}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
