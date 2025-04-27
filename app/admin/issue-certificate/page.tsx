"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import AdminNavbar from "@/components/admin-navbar"
import { adminApi } from "@/lib/api-client"
import { AlertCircle, Search, Check } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Student {
  id: string
  name: string
  email: string
  degree: string
  father_name?: string
  marks?: string
}

export default function IssueCertificate() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [certificateData, setCertificateData] = useState({
    department: "",
    registrationNumber: "",
    studentName: "",
    joinDate: "",
    endDate: "",
    academicYear: "",
    finalScore: "",
    certificateFile: null as File | null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fetchingStudents, setFetchingStudents] = useState(true)
  const [certificateHash, setCertificateHash] = useState("")

  useEffect(() => {
    // Fetch students
    const fetchStudents = async () => {
      try {
        setFetchingStudents(true)
        const data = await adminApi.getStudents()
        setStudents(data)
      } catch (error: any) {
        console.error("Failed to fetch students:", error)
        setError(error.message || "Failed to fetch students")
      } finally {
        setFetchingStudents(false)
      }
    }

    fetchStudents()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCertificateData({
      ...certificateData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    setCertificateData({
      ...certificateData,
      [name]: value,
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCertificateData({
        ...certificateData,
        certificateFile: e.target.files[0],
      })
    }
  }

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student)
    setCertificateData({
      ...certificateData,
      studentName: student.name,
      department: student.degree || certificateData.department,
    })
    setSearchQuery(student.name)
    setShowSearchResults(false)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    setShowSearchResults(query.length > 0)

    // If search is cleared, reset selected student
    if (query === "") {
      setSelectedStudent(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")
    setCertificateHash("")

    try {
      // Create form data to handle file upload
      const formData = new FormData()

      // Add all certificate data to form data
      Object.entries(certificateData).forEach(([key, value]) => {
        if (key === "certificateFile" && value) {
          formData.append("certificateFile", value)
        } else if (value) {
          formData.append(key, value as string)
        }
      })

      // Add student ID if selected
      if (selectedStudent) {
        formData.append("studentId", selectedStudent.id)
      }

      console.log("Submitting certificate data to backend:", {
        url: `/api/admin/issue-certificate`,
        formData: Object.fromEntries(formData.entries()),
      })

      // Call API to issue certificate
      const response = await fetch(`/api/admin/issue-certificate`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to issue certificate")
      }

      const data = await response.json()
      console.log("Certificate issued successfully:", data)

      // Save the certificate hash for the success message
      if (data.certificateHash) {
        setCertificateHash(data.certificateHash)
      }

      setSuccess("Certificate generated successfully!")

      // Redirect to certificate view page after a short delay
      if (data.certificateHash) {
        setTimeout(() => {
          router.push(`/admin/certificates/${data.certificateHash}`)
        }, 1500)
      } else {
        setError("Failed to get certificate hash from response")
      }
    } catch (err: any) {
      console.error("Certificate issuance error:", err)
      setError(err.message || "Failed to issue certificate")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredStudents = students.filter(
    (student) =>
      searchQuery &&
      (student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Issue Certificate</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
                <Check className="h-4 w-4 text-green-500" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  {success}
                  {certificateHash && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Certificate Hash:</p>
                      <p className="text-xs font-mono break-all bg-green-100 p-2 rounded mt-1">{certificateHash}</p>
                      <Button
                        className="mt-2 bg-green-600 hover:bg-green-700"
                        onClick={() => router.push(`/admin/certificates/${certificateHash}`)}
                      >
                        View Certificate
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Student Search Section */}
              <div className="space-y-2">
                <Label htmlFor="studentSearch">
                  Search for Existing Student <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    id="studentSearch"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-10"
                  />
                </div>

                {showSearchResults && filteredStudents.length > 0 && (
                  <div className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto w-full max-w-[calc(100%-2rem)]">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                        onClick={() => handleStudentSelect(student)}
                      >
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-500">
                            {student.email} • {student.degree}
                          </div>
                        </div>
                        {selectedStudent?.id === student.id && <Check className="h-4 w-4 text-green-500" />}
                      </div>
                    ))}
                  </div>
                )}

                {showSearchResults && searchQuery && filteredStudents.length === 0 && (
                  <div className="p-2 text-gray-500 bg-gray-50 border border-gray-200 rounded-md">
                    No students found. You can still create a certificate with manual details.
                  </div>
                )}

                {selectedStudent && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium">Selected Student:</p>
                    <p>
                      {selectedStudent.name} • {selectedStudent.email}
                    </p>
                    <p className="text-sm text-gray-600">Degree: {selectedStudent.degree}</p>
                    {selectedStudent.father_name && (
                      <p className="text-sm text-gray-600">Father's Name: {selectedStudent.father_name}</p>
                    )}
                    {selectedStudent.marks && (
                      <p className="text-sm text-gray-600">Marks/CGPA: {selectedStudent.marks}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="department">
                    Department <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    onValueChange={(value) => handleSelectChange("department", value)}
                    value={certificateData.department}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="computer_science">Computer Science</SelectItem>
                      <SelectItem value="electrical_engineering">Electrical Engineering</SelectItem>
                      <SelectItem value="mechanical_engineering">Mechanical Engineering</SelectItem>
                      <SelectItem value="civil_engineering">Civil Engineering</SelectItem>
                      <SelectItem value="business_administration">Business Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">
                    Registration Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="registrationNumber"
                    name="registrationNumber"
                    value={certificateData.registrationNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="studentName">
                    Student's Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="studentName"
                    name="studentName"
                    value={certificateData.studentName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="joinDate">
                    Join Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="joinDate"
                    name="joinDate"
                    type="date"
                    value={certificateData.joinDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">
                    End Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={certificateData.endDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academicYear">
                    Academic Year <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="academicYear"
                    name="academicYear"
                    placeholder="e.g., 2023-2024"
                    value={certificateData.academicYear}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finalScore">
                    Final Score/GPA <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="finalScore"
                    name="finalScore"
                    value={certificateData.finalScore}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <Label className="text-gray-600">Additional Documents (Optional)</Label>
                <div className="space-y-2">
                  <Label htmlFor="certificateFile">Upload Certificate (PDF/Image)</Label>
                  <Input
                    id="certificateFile"
                    name="certificateFile"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? "Processing..." : "Generate Certificate & QR Code"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
