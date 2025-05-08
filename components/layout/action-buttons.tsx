"use client"

import { useRouter } from "next/navigation"
import { PlusCircle, Save, CreditCard, FileText, Printer, Download, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"

interface ActionButtonsProps {
  pathname: string
  documentSaved?: boolean
}

export function ActionButtons({ pathname, documentSaved = false }: ActionButtonsProps) {
  const router = useRouter()

  // Dashboard has no specific actions
  if (pathname === "/") {
    return null
  }

  // Determine if we're on a list page or a detail/edit page
  const isListPage = !pathname.includes("/new") && !pathname.includes("/edit")

  // Add new item button for list pages
  if (isListPage) {
    const getNewActionDetails = (): { path: string; label: string } | null => {
      if (pathname.startsWith("/invoices")) return { path: "/invoices/new", label: "New Invoice" }
      if (pathname.startsWith("/quotes")) return { path: "/quotes/new", label: "New Quote" }
      if (pathname.startsWith("/customers")) return { path: "/customers/new", label: "New Customer" }
      if (pathname.startsWith("/products")) return { path: "/products/new", label: "New Product" }
      return null // Or a default action if applicable
    }

    const actionDetails = getNewActionDetails()

    if (!actionDetails) {
      return null // Don't render a button if no action is defined for the current path
    }

    return (
      <Button onClick={() => router.push(actionDetails.path)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        {actionDetails.label}
      </Button>
    )
  }

  // Edit/detail page actions
  const isInvoice = pathname.startsWith("/invoices")
  const isQuote = pathname.startsWith("/quotes")
  const isDocument = isInvoice || isQuote

  return (
    <div className="flex items-center gap-2">
      <Button>
        <Save className="mr-2 h-4 w-4" />
        Save
      </Button>

      {isInvoice && (
        <Button variant="outline">
          <CreditCard className="mr-2 h-4 w-4" />
          Mark Paid
        </Button>
      )}

      {isQuote && (
        <Button variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          Convert to Invoice
        </Button>
      )}

      {isDocument && documentSaved && (
        <>
          <Button variant="outline" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Mail className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )
}
