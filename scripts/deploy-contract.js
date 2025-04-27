// This script deploys the certificate contract to the Ethereum network
// Run with: node scripts/deploy-contract.js

import Web3 from "web3"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

// Get directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function deployContract() {
  try {
    // Connect to Ethereum network
    const ethereumRpcUrl =
      process.env.ETHEREUM_RPC_URL || "https://sepolia.infura.io/v3/0bee4e978a50496298e524b09332c57f"
    console.log(`Connecting to Ethereum network: ${ethereumRpcUrl}`)

    const web3 = new Web3(new Web3.providers.HttpProvider(ethereumRpcUrl))

    // Check connection
    const networkId = await web3.eth.net.getId()
    console.log(`Connected to network ID: ${networkId}`)

    // Set up account from private key
    const privateKey = process.env.PRIVATE_KEY
    if (!privateKey) {
      throw new Error("PRIVATE_KEY not set in environment variables")
    }

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.add(account)
    console.log(`Using account: ${account.address}`)

    // Contract ABI and bytecode
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

    const contractBytecode =
      "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555061041f806100606000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c80636d4ce63c14610051578063715018a61461006f5780638da5cb5b14610079578063a6f2ae3a14610097575b600080fd5b61006960048036038101906100649190610214565b6100b3565b6040516100769190610294565b60405180910390f35b610081610127565b60405161008e91906102be565b60405180910390f35b6100b160048036038101906100ac9190610214565b61014f565b005b6000806000838152602001908152602001600020549050600081111561011e576001600084815260200190815260200160002060009054906101000a900460ff1690506101229050565b600090505b919050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600073ffffffffffffffffffffffffffffffffffffffff166000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff161461020e57336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505b50565b60008060006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555042600160008481526020019081526020016000208190555060018060008481526020019081526020016000206000019060010a900460ff16905092915050565b60006020828403121561022a5761022961034c565b5b600082013567ffffffffffffffff81111561024857610247610347565b5b61025484828501610304565b91505092915050565b61026681610335565b82525050565b600061027782610320565b61028181856102d9565b935061029181856020860161034c565b80840191505092915050565b60006020820190506102b0600083018461025d565b92915050565b60006040820190506102cb6000830185610274565b81810360208301526102dd8184610274565b90509392505050565b600081905092915050565b600082825260208201905092915050565b600061030f82610326565b9050919050565b600081519050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000819050919050565b60005b8381101561036a57808201518184015260208101905061034f565b83811115610379576000848401525b50505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000601f19601f830116905091905056fea2646970667358221220a8a7a0a3b6c22f7b8cfce2c9a4bd3be98a86cd2efd7a7b2b95c0b49a71ca316e64736f6c63430008090033"

    // Deploy contract
    console.log("Deploying contract...")
    const contract = new web3.eth.Contract(contractABI)
    const deployTx = contract.deploy({
      data: contractBytecode,
      arguments: [],
    })

    // Estimate gas
    const gas = await deployTx.estimateGas({ from: account.address })
    console.log(`Estimated gas: ${gas}`)

    // Deploy with higher gas limit for safety
    const deployedContract = await deployTx.send({
      from: account.address,
      gas: Math.floor(gas * 1.2), // Add 20% buffer
    })

    console.log(`Contract deployed at address: ${deployedContract.options.address}`)

    // Save contract info to file
    const contractInfo = {
      address: deployedContract.options.address,
      abi: contractABI,
      deployedAt: new Date().toISOString(),
      network: ethereumRpcUrl,
    }

    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), "data")
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    fs.writeFileSync(path.join(dataDir, "contract-info.json"), JSON.stringify(contractInfo, null, 2))

    console.log(`Contract information saved to data/contract-info.json`)

    // Update .env file with contract address
    const envPath = path.join(process.cwd(), ".env")
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf8")

      // Update or add CONTRACT_ADDRESS
      if (envContent.includes("CONTRACT_ADDRESS=")) {
        envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${deployedContract.options.address}`)
      } else {
        envContent += `\nCONTRACT_ADDRESS=${deployedContract.options.address}\n`
      }

      fs.writeFileSync(envPath, envContent)
      console.log("Updated .env file with new contract address")
    } else {
      console.log(`Please add CONTRACT_ADDRESS=${deployedContract.options.address} to your .env file`)
    }

    return deployedContract.options.address
  } catch (error) {
    console.error("Error deploying contract:", error)
    throw error
  }
}

// Run the deployment
deployContract()
  .then((address) => {
    console.log(`Contract deployment complete. Contract address: ${address}`)
    process.exit(0)
  })
  .catch((error) => {
    console.error("Deployment failed:", error)
    process.exit(1)
  })
