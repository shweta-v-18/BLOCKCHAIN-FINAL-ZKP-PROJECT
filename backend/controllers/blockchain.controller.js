import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

// Get directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Path to blockchain data file
const blockchainDataPath = path.join(__dirname, "../data/blockchain_data.json")

// Get all blockchain transactions
export const getBlockchainTransactions = async (req, res) => {
  try {
    // Check if file exists
    if (!fs.existsSync(blockchainDataPath)) {
      return res.status(200).json({ transactions: [] })
    }

    // Read blockchain data
    const data = JSON.parse(fs.readFileSync(blockchainDataPath))

    return res.status(200).json({ transactions: data.certificates || [] })
  } catch (error) {
    console.error("Get blockchain transactions error:", error)
    return res.status(500).json({ message: "Failed to retrieve blockchain transactions" })
  }
}

// Verify certificate on blockchain
export const verifyOnBlockchain = async (req, res) => {
  try {
    const { hash } = req.params

    // Check if file exists
    if (!fs.existsSync(blockchainDataPath)) {
      return res.status(200).json({ isValid: false })
    }

    // Read blockchain data
    const data = JSON.parse(fs.readFileSync(blockchainDataPath))

    // Check if certificate exists
    const certificate = data.certificates.find((cert) => cert.hash === hash)

    return res.status(200).json({ isValid: !!certificate })
  } catch (error) {
    console.error("Blockchain verification error:", error)
    return res.status(500).json({ message: "Failed to verify on blockchain" })
  }
}
