"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Home, Users, FileText, Settings, LogOut, Menu, User, Database } from "lucide-react"
import { adminApi } from "@/lib/api-client"

export default function AdminNavbar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await adminApi.logout()
      router.push("/admin")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <header className="bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/admin/dashboard" className="text-blue-500 text-xl font-bold">
              CertifyChain
            </Link>

            <nav className="hidden md:flex ml-10 space-x-4">
              <Link
                href="/admin/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === "/admin/dashboard" ? "bg-blue-900 text-blue-400" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/admin/students"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === "/admin/students" ? "bg-blue-900 text-blue-400" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                Students
              </Link>
              <Link
                href="/admin/certificates"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === "/admin/certificates" ? "bg-blue-900 text-blue-400" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                Certificates
              </Link>
              <Link
                href="/admin/blockchain"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === "/admin/blockchain" ? "bg-blue-900 text-blue-400" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                Blockchain
              </Link>
            </nav>
          </div>

          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full text-gray-300">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-gray-200">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem className="hover:bg-gray-700">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-gray-700">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem onClick={handleLogout} className="hover:bg-gray-700">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="md:hidden ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-300">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-gray-200">
                  <DropdownMenuItem asChild className="hover:bg-gray-700">
                    <Link href="/admin/dashboard">
                      <Home className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="hover:bg-gray-700">
                    <Link href="/admin/students">
                      <Users className="mr-2 h-4 w-4" />
                      <span>Students</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="hover:bg-gray-700">
                    <Link href="/admin/certificates">
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Certificates</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="hover:bg-gray-700">
                    <Link href="/admin/blockchain">
                      <Database className="mr-2 h-4 w-4" />
                      <span>Blockchain</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
