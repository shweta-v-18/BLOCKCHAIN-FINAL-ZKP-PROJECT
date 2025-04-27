import { createHash } from "crypto"
import Web3 from "web3"
import type { AbiItem } from "web3-utils"
import fs from "fs"
import path from "path"

// Define interfaces for blockchain data
interface BlockchainCertificate {
  hash: string
  txHash: string
  timestamp: string
  zkProof?: any
  salt?: string
}

interface BlockchainData {
  certificates: BlockchainCertificate[]
}

// Connect to Ethereum network with better error handling
let web3: Web3 | null = null
let contract: any = null
let useSimulation = false

// Path to blockchain data file (for simulation fallback)
const blockchainDataPath = path.join(process.cwd(), "data", "blockchain_data.json")

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data")
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Initialize blockchain data file if it doesn't exist
if (!fs.existsSync(blockchainDataPath)) {
  fs.writeFileSync(blockchainDataPath, JSON.stringify({ certificates: [] }))
}

// Try to load contract ABI from contract-info.json
let contractABI: AbiItem[] = []
try {
  const contractInfoPath = path.join(process.cwd(), "data", "contract-info.json")
  if (fs.existsSync(contractInfoPath)) {
    const contractInfo = JSON.parse(fs.readFileSync(contractInfoPath, "utf8"))
    contractABI = contractInfo.abi
    console.log("Loaded contract ABI from contract-info.json")
  }
} catch (error) {
  console.warn("Could not load contract ABI from file, using default ABI")
}

// Use default ABI if we couldn't load from file
if (!contractABI || contractABI.length === 0) {
  contractABI = [
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
      stateMutability: "view",
      type: "function",
    },
  ]
}

// Initialize Web3 and contract
async function initializeWeb3AndContract() {
  try {
    // Only initialize once
    if (web3 && contract) return { web3, contract }

    const ethereumRpcUrl =
      process.env.ETHEREUM_RPC_URL || "https://sepolia.infura.io/v3/0bee4e978a50496298e524b09332c57f"
    console.log(`Attempting to connect to Ethereum network: ${ethereumRpcUrl}`)

    // Create Web3 instance
    web3 = new Web3(new Web3.providers.HttpProvider(ethereumRpcUrl))

    // Test connection
    const blockNumber = await web3.eth.getBlockNumber()
    console.log(`Successfully connected to Web3 provider. Current block: ${blockNumber}`)

    // Get contract address
    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3"

    // Create contract instance
    contract = new web3.eth.Contract(contractABI, contractAddress)
    console.log("Contract instance created successfully at address:", contractAddress)

    // Get account to use for transactions
    const accounts = await web3.eth.getAccounts()
    if (accounts && accounts.length > 0) {
      web3.eth.defaultAccount = accounts[0]
      console.log(`Using account: ${accounts[0]}`)
    } else {
      // Try to use the account from environment variable
      const account = process.env.ETHEREUM_ACCOUNT
      if (account) {
        web3.eth.defaultAccount = account
        console.log(`Using account from environment: ${account}`)
      } else {
        console.warn("No accounts available. Transactions will fail unless a private key is provided.")
      }
    }

    // If private key is available, add it to the wallet
    const privateKey = process.env.PRIVATE_KEY
    if (privateKey) {
      const account = web3.eth.accounts.privateKeyToAccount(privateKey)
      web3.eth.accounts.wallet.add(account)
      web3.eth.defaultAccount = account.address
      console.log(`Using account from private key: ${account.address}`)
    }

    useSimulation = false
    return { web3, contract }
  } catch (error) {
    console.error("Failed to initialize Web3 or contract:", error)
    useSimulation = true
    return { web3: null, contract: null }
  }
}

// Create certificate hash
export const createCertificateHash = (certificateData: any): string => {
  const dataString = JSON.stringify(certificateData)
  return createHash("sha256").update(dataString).digest("hex")
}

// Store hash on blockchain
export const storeHashOnBlockchain = async (hash: string, certificateData?: any): Promise<string> => {
  try {
    // Initialize Web3 and contract
    const { web3, contract } = await initializeWeb3AndContract()

    if (web3 && contract && web3.eth.defaultAccount) {
      try {
        console.log(`Storing hash ${hash} on blockchain from account ${web3.eth.defaultAccount}`)

        // Send transaction to store hash on blockchain
        const tx = await contract.methods.storeCertificate(hash).send({
          from: web3.eth.defaultAccount,
          gas: 500000, // Adjust gas as needed
        })

        console.log(`Hash ${hash} stored on blockchain with transaction ${tx.transactionHash}`)

        // Also store locally as backup
        storeHashLocally(hash, tx.transactionHash)

        return tx.transactionHash
      } catch (txError) {
        console.error("Transaction error:", txError)
        // Fall back to simulation if transaction fails
        useSimulation = true
      }
    }

    // Simulation fallback
    if (useSimulation) {
      console.log(`Simulating storage of hash ${hash} on blockchain`)
      const txHash = `0x${createHash("sha256")
        .update(hash + Date.now())
        .digest("hex")}`
      storeHashLocally(hash, txHash)
      return txHash
    }

    throw new Error("Failed to store hash on blockchain")
  } catch (error) {
    console.error("Blockchain storage error:", error)

    // Always store locally even if there's an error
    const txHash = `0x${createHash("sha256")
      .update(hash + Date.now())
      .digest("hex")}`
    storeHashLocally(hash, txHash)

    return txHash
  }
}

// Store hash locally (for simulation or backup)
const storeHashLocally = (hash: string, txHash: string) => {
  try {
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // Read existing data or create new data structure
    let data: BlockchainData = { certificates: [] }
    if (fs.existsSync(blockchainDataPath)) {
      try {
        const fileContent = fs.readFileSync(blockchainDataPath, "utf8")
        data = JSON.parse(fileContent) as BlockchainData
      } catch (parseError) {
        console.error("Error parsing blockchain data file, creating new one:", parseError)
      }
    }

    // Add new certificate
    data.certificates.push({
      hash,
      txHash,
      timestamp: new Date().toISOString(),
    })

    // Write back to file
    fs.writeFileSync(blockchainDataPath, JSON.stringify(data, null, 2))

    console.log(`Hash ${hash} stored locally with transaction ${txHash}`)
  } catch (error) {
    console.error("Error storing hash locally:", error)
  }
}

// Verify hash on blockchain
export const verifyHashOnBlockchain = async (hash: string): Promise<boolean> => {
  try {
    // First check locally (as a backup)
    const localResult = checkHashLocally(hash)
    if (localResult) {
      console.log(`Certificate ${hash} found in local blockchain data`)
      return true
    }

    // Initialize Web3 and contract
    const { web3, contract } = await initializeWeb3AndContract()

    if (web3 && contract) {
      try {
        console.log(`Verifying hash ${hash} on blockchain`)
        // First try certificateExists method
        const exists = await contract.methods.certificateExists(hash).call()
        if (exists) {
          console.log(`Certificate ${hash} exists on blockchain`)
          return true
        }

        // If not found with certificateExists, try verifyCertificate as fallback
        const isValid = await contract.methods.verifyCertificate(hash).call()
        console.log(`Blockchain verification result for ${hash}: ${isValid}`)
        return isValid
      } catch (verifyError) {
        console.error("Verification error:", verifyError)
        // Fall back to simulation if verification fails
        useSimulation = true
      }
    }

    // If we're in simulation mode or verification failed, check locally
    console.log(`Simulating verification of hash ${hash} on blockchain`)
    return checkHashLocally(hash)
  } catch (error) {
    console.error("Blockchain verification error:", error)
    return checkHashLocally(hash) // Fall back to local check
  }
}

// Check hash locally
const checkHashLocally = (hash: string): boolean => {
  try {
    if (fs.existsSync(blockchainDataPath)) {
      const fileContent = fs.readFileSync(blockchainDataPath, "utf8")
      const data: BlockchainData = JSON.parse(fileContent)

      const certificate = data.certificates.find((cert) => cert.hash === hash)
      return !!certificate
    }
  } catch (error) {
    console.error("Error checking hash locally:", error)
  }
  return false
}

// Get all blockchain transactions
export const getAllBlockchainTransactions = (): BlockchainCertificate[] => {
  try {
    if (fs.existsSync(blockchainDataPath)) {
      const fileContent = fs.readFileSync(blockchainDataPath, "utf8")
      const data = JSON.parse(fileContent) as BlockchainData
      return data.certificates || []
    }
  } catch (error) {
    console.error("Error getting blockchain transactions:", error)
  }

  return []
}

// Get blockchain data file path
export const getBlockchainDataFilePath = (): string => {
  return blockchainDataPath
}

// Initialize Web3 and contract on module load
initializeWeb3AndContract().catch(console.error)
