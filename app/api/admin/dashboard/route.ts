import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Get dashboard statistics
    const studentsCount = await db.query("SELECT COUNT(*) as count FROM students")
    const certificatesCount = await db.query("SELECT COUNT(*) as count FROM certificates")
    const verificationsCount = await db.query("SELECT COUNT(*) as count FROM verifications WHERE is_valid = 1")
    const pendingCount = await db.query("SELECT COUNT(*) as count FROM verifications WHERE is_valid = 0")

    // Get recent certificates
    const recentCertificates = await db.query(`
      SELECT c.id, c.certificate_hash, c.issue_date, s.name, 
             (SELECT COUNT(*) > 0 FROM verifications v WHERE v.certificate_id = c.id AND v.is_valid = 1) as verified
      FROM certificates c
      JOIN students s ON c.student_id = s.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `)

    // Format certificates for response
    const formattedCertificates = recentCertificates.map((cert: any) => ({
      id: cert.certificate_hash,
      name: cert.name,
      date: cert.issue_date,
      status: cert.verified ? "verified" : "pending",
    }))

    return NextResponse.json({
      stats: {
        students: studentsCount[0]?.count || 0,
        certificates: certificatesCount[0]?.count || 0,
        verifications: verificationsCount[0]?.count || 0,
        pending: pendingCount[0]?.count || 0,
      },
      recentCertificates: formattedCertificates,
    })
  } catch (error) {
    console.error("Dashboard data error:", error)
    return NextResponse.json({ message: "Failed to fetch dashboard data" }, { status: 500 })
  }
}
