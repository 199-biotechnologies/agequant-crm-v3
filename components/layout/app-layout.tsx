"use client"

import type React from "react"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { BarChart3, FileText, FileCheck, Users, Package, Settings } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopBar } from "@/components/layout/top-bar"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: BarChart3,
      active: pathname === "/",
    },
    {
      title: "Invoices",
      href: "/invoices",
      icon: FileText,
      active: pathname.startsWith("/invoices"),
    },
    {
      title: "Quotes",
      href: "/quotes",
      icon: FileCheck,
      active: pathname.startsWith("/quotes"),
    },
    {
      title: "Customers",
      href: "/customers",
      icon: Users,
      active: pathname.startsWith("/customers"),
    },
    {
      title: "Products",
      href: "/products",
      icon: Package,
      active: pathname.startsWith("/products"),
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      active: pathname.startsWith("/settings"),
    },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar navItems={navItems} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} showBackButton={pathname !== "/"} />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
