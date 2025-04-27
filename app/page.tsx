import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-blue-600 text-2xl font-bold mb-2">CertifyChain</h1>
          <h2 className="text-2xl font-bold mb-4">Student Certificate Verification using Blockchain</h2>
          <p className="text-gray-600 mb-8">
            Secure and efficient system for verifying academic credentials using blockchain technology. Ensure
            authenticity with tamper-proof records and instant verification.
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <Link href="/admin">
            <Button className="bg-gray-200 text-black hover:bg-gray-300 px-6 py-2">ADMIN PORTAL</Button>
          </Link>
          <Link href="/verifier">
            <Button className="bg-gray-200 text-black hover:bg-gray-300 px-6 py-2">VERIFIER PORTAL</Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
