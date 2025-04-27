import crypto from "crypto"
import Web3 from "web3"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

// Import the ZKP utilities if they exist
let generateProof, verifyProof, generateSalt
try {
  const zkp = await import("./zkp.js")
  generateProof = zkp.generateProof
  verifyProof = zkp.verifyProof
  generateSalt = zkp.generateSalt
} catch (error) {
  console.warn("ZKP utilities not available, using fallback methods")
  // Fallback implementations if zkp.js doesn't exist
  generateProof = (data, salt) => ({ proof: "simulated", publicSignals: ["simulated"] })
  verifyProof = () => true
  generateSalt = () => crypto.randomBytes(16).toString("hex")
}

dotenv.config()

// Get directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Path to blockchain data file (for fallback)
const blockchainDataPath = path.join(__dirname, "../data/blockchain_data.json")

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, "../data")
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Initialize blockchain data file if it doesn't exist (for fallback)
if (!fs.existsSync(blockchainDataPath)) {
  fs.writeFileSync(blockchainDataPath, JSON.stringify({ certificates: [] }))
}

// Connect to Ethereum network with better error handling
let web3 = null
let contract = null

// We'll use a simulation flag to avoid repeated connection attempts
let useSimulation = false

// Function to attempt blockchain connection
const attemptBlockchainConnection = async () => {
  if (useSimulation) {
    return false // Skip connection attempt if we're already in simulation mode
  }

  try {
    const ethereumRpcUrl = process.env.ETHEREUM_RPC_URL || "http://localhost:8545"
    web3 = new Web3(ethereumRpcUrl)
    console.log("Attempting to connect to Ethereum network:", ethereumRpcUrl)

    // Test the connection with a timeout
    const connectionPromise = web3.eth.getBlockNumber()
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 3000))

    const blockNumber = await Promise.race([connectionPromise, timeoutPromise])
    console.log("Successfully connected to Ethereum network. Current block:", blockNumber)
    return true
  } catch (error) {
    console.warn("Could not connect to Ethereum network. Using simulated blockchain:", error.message)
    web3 = null
    useSimulation = true // Set simulation flag to avoid repeated connection attempts
    return false
  }
}

// Try to connect initially
attemptBlockchainConnection().catch((err) => {
  console.warn("Initial blockchain connection failed, will use simulation:", err.message)
  useSimulation = true
})

// Smart contract ABI
const contractABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "certificateHash",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "CertificateStored",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "certificateHash",
        type: "string",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "isValid",
        type: "bool",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "CertificateVerified",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "certificateHash",
        type: "string",
      },
    ],
    name: "certificateExists",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "certificateHash",
        type: "string",
      },
    ],
    name: "getCertificateIssueDate",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "certificateHash",
        type: "string",
      },
    ],
    name: "storeCertificate",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "certificateHash",
        type: "string",
      },
    ],
    name: "verifyCertificate",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
]

const contractAddress = process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"

// Create contract instance if web3 is available
if (web3 && !useSimulation) {
  try {
    contract = new web3.eth.Contract(contractABI, contractAddress)
    console.log("Contract instance created at address:", contractAddress)
    console.log("Contract instance created at address:", contractAddress)
  } catch (error) {
    console.warn("Could not create contract instance. Using simulated blockchain:", error.message)
    useSimulation = true
  }
}

// Create certificate hash
export const createCertificateHash = (certificateData) => {
  const dataString = JSON.stringify(certificateData)
  return crypto.createHash("sha256").update(dataString).digest("hex")
}

// Store hash on blockchain with ZKP
export const storeHashOnBlockchain = async (hash, certificateData = {}) => {
  try {
    // Generate salt for ZK proof if ZKP is available
    const salt = generateSalt ? generateSalt() : crypto.randomBytes(16).toString("hex")

    // Generate a ZK proof if available
    const zkProof = generateProof
      ? await generateProof(certificateData, salt)
      : {
          proof: "simulated",
          publicSignals: ["simulated"],
        }

    // Store the ZK proof with the hash
    const zkpData = {
      hash,
      zkProof,
      salt,
      timestamp: new Date().toISOString(),
    }

    // If we're not in simulation mode, try to use real blockchain
    if (!useSimulation && web3 && contract && contractAddress !== "0x0000000000000000000000000000000000000000") {
      try {
        // Attempt to get accounts, with a timeout to prevent long hangs
        const accountPromise = web3.eth.getAccounts()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout")), 3000),
        )

        const accounts = await Promise.race([accountPromise, timeoutPromise])
        const account = accounts[0] || process.env.ETHEREUM_ACCOUNT

        if (account) {
          console.log(`Storing hash ${hash} on blockchain using account ${account} with ZKP`)

          // Make sure we have a timeout here too
          const gasEstimatePromise = contract.methods.storeCertificate(hash).estimateGas({ from: account })
          const gasEstimate = await Promise.race([gasEstimatePromise, timeoutPromise])

          const txPromise = contract.methods.storeCertificate(hash).send({
            from: account,
            gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
          })

          const tx = await Promise.race([txPromise, timeoutPromise])

          console.log(`Hash ${hash} stored on blockchain with ZKP. Transaction: ${tx.transactionHash}`)

          // Also store in local file as backup (including ZKP data)
          storeHashLocallyWithZKP(hash, tx.transactionHash, zkpData)

          return tx.transactionHash
        } else {
          throw new Error("No Ethereum account available")
        }
      } catch (error) {
        console.warn(`Failed to store on real blockchain, falling back to simulation: ${error.message}`)
        // Set simulation flag for future calls
        useSimulation = true
        // Continue to simulation below
      }
    }

    // Simulate blockchain storage
    console.log(`Simulating storage of hash ${hash} on blockchain with ZKP`)
    const txHash = `0x${crypto
      .createHash("sha256")
      .update(hash + Date.now())
      .digest("hex")}`

    // Store in local file (with ZKP data)
    storeHashLocallyWithZKP(hash, txHash, zkpData)

    return txHash
  } catch (error) {
    console.error("Blockchain storage error:", error)
    // Continue with local storage even if there's an error
    const txHash = `0x${crypto
      .createHash("sha256")
      .update(hash + Date.now())
      .digest("hex")}`

    // Store in local file as fallback
    try {
      storeHashLocallyWithZKP(hash, txHash, {
        hash,
        zkProof: { proof: "simulated", publicSignals: ["simulated"] },
        salt: crypto.randomBytes(16).toString("hex"),
        timestamp: new Date().toISOString(),
      })
    } catch (localError) {
      console.error("Failed to store hash locally:", localError)
    }

    return txHash
  }
}

// New function to store hash with ZKP data
const storeHashLocallyWithZKP = (hash, txHash, zkpData) => {
  try {
    // Ensure the data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // Read existing data or create new data structure
    let data = { certificates: [] }
    if (fs.existsSync(blockchainDataPath)) {
      try {
        const fileContent = fs.readFileSync(blockchainDataPath, "utf8")
        data = JSON.parse(fileContent)
      } catch (parseError) {
        console.error("Error parsing blockchain data file, creating new one:", parseError)
      }
    }

    // Add new certificate with ZKP data
    data.certificates.push({
      hash,
      txHash,
      zkProof: zkpData.zkProof,
      salt: zkpData.salt,
      timestamp: zkpData.timestamp,
    })

    // Write back to file
    fs.writeFileSync(blockchainDataPath, JSON.stringify(data, null, 2))

    console.log(`Hash ${hash} stored locally with transaction ${txHash} and ZKP data`)
  } catch (error) {
    console.error("Error storing hash locally:", error)
  }
}

// Update the verifyHashOnBlockchain function to use ZKP
export const verifyHashOnBlockchain = async (hash, zkProofData = null) => {
  try {
    // If we're not in simulation mode, try to use real blockchain
    if (!useSimulation && web3 && contract && contractAddress !== "0x0000000000000000000000000000000000000000") {
      try {
        console.log(`Verifying hash ${hash} on blockchain with ZKP`)

        // In a real implementation, we would verify the ZK proof on-chain
        const isHashValid = await contract.methods.certificateExists(hash).call()

        // If we have ZK proof data, verify it
        let isZkProofValid = true
        if (zkProofData && zkProofData.zkProof && zkProofData.certificateCommitment) {
          isZkProofValid = await verifyProof(zkProofData.zkProof, zkProofData.certificateCommitment)
        }

        console.log(`Hash ${hash} verification on blockchain: ${isHashValid}, ZKP valid: ${isZkProofValid}`)
        return isHashValid && isZkProofValid
      } catch (error) {
        console.warn("Failed to verify on real blockchain, falling back to simulation:", error.message)
        // Set simulation flag for future calls
        useSimulation = true
      }
    }

    // Simulate blockchain verification
    console.log(`Simulating verification of hash ${hash} on blockchain with ZKP`)

    // Check in local file
    let data = { certificates: [] }
    if (fs.existsSync(blockchainDataPath)) {
      try {
        const fileContent = fs.readFileSync(blockchainDataPath, "utf8")
        data = JSON.parse(fileContent)
      } catch (parseError) {
        console.error("Error parsing blockchain data file:", parseError)
      }
    }

    const certificate = data.certificates.find((cert) => cert.hash === hash)

    // If we have ZK proof data, verify it
    let isZkProofValid = true
    if (certificate && certificate.zkProof && zkProofData && zkProofData.certificateCommitment) {
      isZkProofValid = await verifyProof(certificate.zkProof, zkProofData.certificateCommitment)
    }

    return !!certificate && isZkProofValid
  } catch (error) {
    console.error("Blockchain verification error:", error)
    return false
  }
}

// Get blockchain transaction details
export const getTransactionDetails = async (txHash) => {
  try {
    if (!useSimulation && web3 && txHash.startsWith("0x") && txHash.length === 66) {
      try {
        const tx = await web3.eth.getTransaction(txHash)
        if (tx) {
          return {
            blockNumber: tx.blockNumber,
            from: tx.from,
            to: tx.to,
            timestamp: Date.now(), // Ethereum doesn't store timestamps in transactions directly
            status: "confirmed",
          }
        }
      } catch (error) {
        console.warn("Failed to get transaction details from blockchain:", error.message)
        // Set simulation flag for future calls
        useSimulation = true
      }
    }

    // Fallback to local data
    let data = { certificates: [] }
    if (fs.existsSync(blockchainDataPath)) {
      try {
        const fileContent = fs.readFileSync(blockchainDataPath, "utf8")
        data = JSON.parse(fileContent)
      } catch (parseError) {
        console.error("Error parsing blockchain data file:", parseError)
      }
    }

    const certificate = data.certificates.find((cert) => cert.txHash === txHash)

    if (certificate) {
      return {
        blockNumber: "N/A",
        from: "Simulated",
        to: contractAddress,
        timestamp: new Date(certificate.timestamp).getTime(),
        status: "confirmed",
      }
    }

    return null
  } catch (error) {
    console.error("Error getting transaction details:", error)
    return null
  }
}
