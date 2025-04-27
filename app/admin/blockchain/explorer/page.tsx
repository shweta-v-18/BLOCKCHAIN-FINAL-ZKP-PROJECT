"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, ExternalLink, Database, FileText } from "lucide-react"
import AdminNavbar from "@/components/admin-navbar"
import { getAllBlockchainTransactions, getBlockchainDataFilePath } from "@/lib/blockchain"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

interface BlockchainTransaction {
  hash: string
  txHash: string
  timestamp: string
}

export default function BlockchainExplorer() {
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [dataFilePath, setDataFilePath] = useState("")
  const [activeTab, setActiveTab] = useState("transactions")

  useEffect(() => {
    fetchBlockchainData()
  }, [])

  const fetchBlockchainData = async () => {
    try {
      setLoading(true)

      // Get all blockchain transactions
      const txs = getAllBlockchainTransactions()
      setTransactions(txs)

      // Get blockchain data file path
      const filePath = getBlockchainDataFilePath()
      setDataFilePath(filePath)
    } catch (error: any) {
      console.error("Failed to fetch blockchain data:", error)
      setError(error.message || "Failed to fetch blockchain data")
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleCheckCertificate = async () => {
    if (!searchTerm) {
      setError("Please enter a certificate hash to check")
      return
    }

    try {
      const exists = transactions.some((tx) => tx.hash === searchTerm)

      if (exists) {
        setError("")
        alert(`Certificate with hash ${searchTerm} exists in the blockchain!`)
      } else {
        setError(`Certificate with hash ${searchTerm} does not exist in the blockchain.`)
      }
    } catch (error: any) {
      console.error("Error checking certificate:", error)
      setError(error.message || "Failed to check certificate")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <AdminNavbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center">Loading blockchain data...</p>
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
            <CardTitle className="text-white">Blockchain Explorer</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search hash or transaction..."
                  className="pl-8 bg-gray-800 border-gray-700 text-white"
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCheckCertificate}>
                Check Certificate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-900 border-red-800 text-red-200">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-gray-800 mb-4">
                <TabsTrigger value="transactions" className="data-[state=active]:bg-blue-600">
                  <Database className="h-4 w-4 mr-2" />
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="info" className="data-[state=active]:bg-blue-600">
                  <FileText className="h-4 w-4 mr-2" />
                  Blockchain Info
                </TabsTrigger>
              </TabsList>

              <TabsContent value="transactions">
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
                            <div className="flex space-x-2">
                              <Link href={`/admin/certificates/${tx.hash}`}>
                                <Button variant="ghost" size="sm" className="text-blue-400">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View Certificate
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="info">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Blockchain Configuration</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400">Simulation Mode:</p>
                      <p className="font-semibold">Enabled</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Data Storage:</p>
                      <p className="font-mono text-xs break-all">{dataFilePath}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Total Certificates:</p>
                      <p className="font-semibold">{transactions.length}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-semibold mb-2">About Simulation Mode</h4>
                    <p className="text-sm text-gray-400">
                      The application is currently running in simulation mode, which means it's not connected to a real
                      Ethereum blockchain. All certificate hashes are stored locally in a JSON file. In a production
                      environment, these would be stored on the Ethereum blockchain.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
