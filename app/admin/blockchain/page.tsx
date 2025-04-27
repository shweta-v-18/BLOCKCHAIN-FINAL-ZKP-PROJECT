"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, ExternalLink } from "lucide-react"
import AdminNavbar from "@/components/admin-navbar"

interface Transaction {
  hash: string
  txHash: string
  timestamp: string
}

export default function BlockchainPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/blockchain-transactions`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch blockchain transactions")
      }

      const data = await response.json()
      setTransactions(data.transactions)
    } catch (error: any) {
      console.error("Failed to fetch transactions:", error)
      setError(error.message || "Failed to fetch blockchain transactions")
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <AdminNavbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center">Loading blockchain transactions...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AdminNavbar />

      <main className="container mx-auto px-4 py-8">
        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Blockchain Transactions</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search transactions..."
                className="pl-8 bg-gray-800 border-gray-700 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <p className="text-center py-4 text-gray-400">
                {searchTerm ? "No transactions match your search" : "No blockchain transactions found"}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-400">Certificate Hash</TableHead>
                    <TableHead className="text-gray-400">Transaction Hash</TableHead>
                    <TableHead className="text-gray-400">Timestamp</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.txHash} className="border-gray-800">
                      <TableCell className="font-mono text-xs">
                        {tx.hash.substring(0, 8)}...{tx.hash.substring(tx.hash.length - 8)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {tx.txHash.substring(0, 8)}...{tx.txHash.substring(tx.txHash.length - 8)}
                      </TableCell>
                      <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-600">Confirmed</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-blue-400">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View on Explorer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
