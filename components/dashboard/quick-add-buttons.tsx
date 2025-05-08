"use client"

import { useRouter } from "next/navigation"
import { FileText, FileCheck, Users, Package } from "lucide-react"

import { Button } from "@/components/ui/button"

export function QuickAddButtons() {
  const router = useRouter()

  const quickAddItems = [
    {
      title: "Invoice",
      icon: FileText,
      href: "/invoices/new",
    },
    {
      title: "Quote",
      icon: FileCheck,
      href: "/quotes/new",
    },
    {
      title: "Customer",
      icon: Users,
      href: "/customers/new",
    },
    {
      title: "Product",
      icon: Package,
      href: "/products/new",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {quickAddItems.map((item) => (
        <Button
          key={item.title}
          variant="outline"
          className="flex h-24 flex-col items-center justify-center gap-2"
          onClick={() => router.push(item.href)}
        >
          <item.icon className="h-6 w-6" />
          <span>{item.title}</span>
        </Button>
      ))}
    </div>
  )
}
