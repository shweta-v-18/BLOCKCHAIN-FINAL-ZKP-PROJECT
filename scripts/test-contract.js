// This script tests the deployed certificate contract
// Run with: node scripts/test-contract.js

import Web3 from "web3"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import { createHash } from "crypto"

// Load environment variables
dotenv.config()

// Get directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function testContract() {
  try {
    // Connect to Ethereum network
    const ethereumRpcUrl =
      process.env.ETHEREUM_RPC_URL || "https://sepolia.infura.io/v3/0bee4e978a50496298e524b09332c57f"
    console.log(`Connecting to Ethereum network: ${ethereumRpcUrl}`)

    const web3 = new Web3(new Web3.providers.HttpProvider(ethereumRpcUrl))

    // Set up account from private key
    const privateKey = process.env.PRIVATE_KEY
    if (!privateKey) {
      throw new Error("PRIVATE_KEY not set in environment variables")
    }

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.add(account)
    console.log(`Using account: ${account.address}`)

    // Get contract address
    const contractAddress = process.env.CONTRACT_ADDRESS
    if (!contractAddress) {
      throw new Error("CONTRACT_ADDRESS not set in environment variables")
    }

    // Load contract ABI
    let contractABI
    try {
      const contractInfoPath = path.join(process.cwd(), "data", "contract-info.json")
      const contractInfo = JSON.parse(fs.readFileSync(contractInfoPath, "utf8"))
      contractABI = contractInfo.abi
    } catch (error) {
      console.error("Error loading contract info:", error)
      throw new Error("Could not load contract ABI")
    }

    // Create contract instance
    const contract = new web3.eth.Contract(contractABI, contractAddress)
    console.log(`Connected to contract at address: ${contractAddress}`)

    // Create a test certificate hash
    const testData = {
      studentName: "Test Student",
      degree: "Test Degree",
      timestamp: new Date().toISOString(),
    }

    const testHash = createHash("sha256").update(JSON.stringify(testData)).digest("hex")
    console.log(`Test certificate hash: ${testHash}`)

    // Check if certificate exists (should be false)
    const existsBefore = await contract.methods.certificateExists(testHash).call()
    console.log(`Certificate exists before storing: ${existsBefore}`)

    // Store certificate
    console.log("Storing certificate on blockchain...")
    const tx = await contract.methods.storeCertificate(testHash).send({
      from: account.address,
      gas: 200000,
    })

    console.log(`Transaction hash: ${tx.transactionHash}`)
    console.log(`Gas used: ${tx.gasUsed}`)

    // Check if certificate exists now (should be true)
    const existsAfter = await contract.methods.certificateExists(testHash).call()
    console.log(`Certificate exists after storing: ${existsAfter}`)

    // Verify certificate
    const isValid = await contract.methods.verifyCertificate(testHash).call()
    console.log(`Certificate is valid: ${isValid}`)

    console.log("Contract test completed successfully!")
    return true
  } catch (error) {
    console.error("Error testing contract:", error)
    return false
  }
}

// Run the test
testContract()
  .then((success) => {
    if (success) {
      console.log("All tests passed!")
    } else {
      console.log("Tests failed!")
    }
    process.exit(0)
  })
  .catch((error) => {
    console.error("Test execution failed:", error)
    process.exit(1)
  })
