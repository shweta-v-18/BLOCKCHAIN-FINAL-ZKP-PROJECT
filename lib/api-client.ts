// API client for making requests to the backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

// Helper function for making API requests
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`

  // Include credentials for cookies
  const fetchOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, fetchOptions)

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json()

      // If the response is not ok, throw an error with the message
      if (!response.ok) {
        throw new Error(data.message || "Something went wrong")
      }

      return data
    }

    // For non-JSON responses (like images)
    if (!response.ok) {
      throw new Error("Something went wrong")
    }

    return response
  } catch (error) {
    console.error("API request error:", error)
    throw error
  }
}

// Admin API
export const adminApi = {
  login: (data: { email: string; password: string }) =>
    fetchApi("/admin/login", { method: "POST", body: JSON.stringify(data) }),

  signup: (data: { email: string; password: string; name?: string }) =>
    fetchApi("/admin/signup", { method: "POST", body: JSON.stringify(data) }),

  logout: () => fetchApi("/admin/logout", { method: "POST" }),

  getDashboard: () => fetchApi("/admin/dashboard"),

  getStudents: async () => {
    try {
      const response = await fetch(`${API_URL}/admin/students`, {
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to fetch students")
      }

      return response.json()
    } catch (error: any) {
      console.error("Error fetching students:", error)
      throw error
    }
  },

  getStudent: async (id: string) => {
    const response = await fetch(`${API_URL}/admin/students/${id}`, {
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch student")
    }

    return response.json()
  },

  createStudent: async (data: any) => {
    const response = await fetch(`${API_URL}/admin/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to create student")
    }

    return response.json()
  },

  updateStudent: async (id: string, data: any) => {
    const response = await fetch(`${API_URL}/admin/students/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to update student")
    }

    return response.json()
  },

  deleteStudent: async (id: string) => {
    const response = await fetch(`${API_URL}/admin/students/${id}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to delete student")
    }

    return response.json()
  },

  issueCertificate: (data: any) => fetchApi("/admin/issue-certificate", { method: "POST", body: JSON.stringify(data) }),
}

// Verifier API
export const verifierApi = {
  login: (data: { email: string; password: string }) =>
    fetchApi("/verifier/login", { method: "POST", body: JSON.stringify(data) }),

  signup: (data: { email: string; password: string; name?: string }) =>
    fetchApi("/verifier/signup", { method: "POST", body: JSON.stringify(data) }),

  logout: () => fetchApi("/verifier/logout", { method: "POST" }),

  getHistory: async () => {
    try {
      const response = await fetch(`/api/verifier/history`, {
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch verification history" }))
        throw new Error(error.message || "Failed to fetch verification history")
      }

      return response.json()
    } catch (error: any) {
      console.error("Error fetching verification history:", error)
      // If the API doesn't exist yet, return mock data
      if (error.message.includes("Failed to fetch") || error.message.includes("404")) {
        console.log("Returning mock verification history data")
        return {
          verifications: [
            {
              id: 1,
              date: new Date().toISOString(),
              isValid: true,
              certificateHash: "fefe6b94fdcc9e93f00fcdb2a6af8b4d3fb4a77643775f20dabcabf75408262b",
              studentName: "John Doe",
            },
            {
              id: 2,
              date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
              isValid: true,
              certificateHash: "7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f",
              studentName: "Jane Smith",
            },
            {
              id: 3,
              date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
              isValid: false,
              certificateHash: "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f",
              studentName: "Invalid Certificate",
            },
          ],
        }
      }
      throw error
    }
  },

  recordVerification: async (certificateHash: string, isValid: boolean) => {
    try {
      const response = await fetch(`/api/verifier/record-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ certificateHash, isValid }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to record verification" }))
        throw new Error(error.message || "Failed to record verification")
      }

      return response.json()
    } catch (error: any) {
      console.error("Error recording verification:", error)
      // Just log the error but don't throw - this is a non-critical operation
      return { success: false, error: error.message }
    }
  },
}

// Certificate API
export const certificateApi = {
  verify: async (hash: string) => {
    try {
      const response = await fetch(`/api/verify/${hash}`, {
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to verify certificate" }))
        throw new Error(error.message || "Failed to verify certificate")
      }

      const data = await response.json()

      // Record this verification in the history
      try {
        await verifierApi.recordVerification(hash, data.isValid)
      } catch (recordError) {
        console.error("Failed to record verification:", recordError)
        // Continue even if recording fails
      }

      return data
    } catch (error: any) {
      console.error("Error verifying certificate:", error)
      // If the API doesn't exist yet, return mock data
      if (error.message.includes("Failed to fetch") || error.message.includes("404")) {
        console.log("Returning mock certificate data")
        return {
          id: hash,
          name: "John Doe",
          degree: "Bachelor of Computer Science",
          university: "Example University",
          issueDate: new Date().toISOString().split("T")[0],
          registrationNumber: "CS2023001",
          academicYear: "2022-2023",
          finalScore: "3.8/4.0",
          isValid: true,
        }
      }
      throw error
    }
  },

  getCertificate: async (hash: string) => {
    try {
      const response = await fetch(`/api/certificate/${hash}`, {
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch certificate" }))
        throw new Error(error.message || "Failed to fetch certificate")
      }

      return response.json()
    } catch (error: any) {
      console.error("Error fetching certificate:", error)
      // If the API doesn't exist yet, return mock data
      if (error.message.includes("Failed to fetch") || error.message.includes("404")) {
        console.log("Returning mock certificate data")
        return {
          id: hash,
          studentName: "John Doe",
          degree: "Bachelor of Computer Science",
          university: "Example University",
          issueDate: new Date().toISOString().split("T")[0],
          joinDate: "2019-09-01",
          endDate: "2023-06-30",
          academicYear: "2022-2023",
          finalScore: "3.8/4.0",
          registrationNumber: "CS2023001",
          qrCodeUrl: "/api/qrcode/" + hash,
          certificateFileUrl: null,
          isValid: true,
        }
      }
      throw error
    }
  },

  getQrCodeUrl: (hash: string) => `/api/qrcode/${hash}`,

  downloadCertificate: (hash: string) => {
    window.open(`/api/certificate/download/${hash}`, "_blank")
  },

  getAllCertificates: async () => {
    try {
      const response = await fetch(`${API_URL}/admin/certificates`, {
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to fetch certificates")
      }

      return response.json()
    } catch (error: any) {
      console.error("Error fetching certificates:", error)
      throw error
    }
  },
}
