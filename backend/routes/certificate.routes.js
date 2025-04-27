import express from "express"
import {
  issueCertificate,
  getCertificateByHash,
  verifyCertificate,
  generateQRCode,
  getCertificateFile,
  getAllCertificates,
  upload,
} from "../controllers/certificate.controller.js"
import { authenticate } from "../utils/auth.js"

const router = express.Router()

// Add this near the top of your routes
router.get("/test", (req, res) => {
  res.status(200).json({ message: "Certificate API is working" })
})

// Certificate routes
router.post("/admin/issue-certificate", authenticate(["admin"]), upload.single("certificateFile"), issueCertificate)
router.get("/admin/certificates", authenticate(["admin"]), getAllCertificates)
router.get("/certificate/:hash", getCertificateByHash)
router.get("/verify/:hash", verifyCertificate)
router.get("/qrcode/:hash", generateQRCode)
router.get("/uploads/certificates/:filename", getCertificateFile)

export default router
