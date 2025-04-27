import express from "express"
import { getBlockchainTransactions, verifyOnBlockchain } from "../controllers/blockchain.controller.js"
import { authenticate } from "../utils/auth.js"

const router = express.Router()

// Blockchain routes
router.get("/admin/blockchain-transactions", authenticate(["admin"]), getBlockchainTransactions)
router.get("/blockchain/verify/:hash", verifyOnBlockchain)

export default router
