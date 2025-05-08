"use client"

import { useRouter } from "next/navigation"
import Link from "next/link" // Import Link
import { PlusCircle, Save, CreditCard, FileText, Printer, Download, Mail, Edit, Trash2 } from "lucide-react"
import { useTransition } from "react" // For delete pending state
import { toast } from "sonner" // For delete feedback

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteCustomer } from "@/app/customers/actions" // Import delete action

interface ActionButtonsProps {
  pathname: string
  documentSaved?: boolean
}

export function ActionButtons({ pathname, documentSaved = false }: ActionButtonsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition() // For delete action

  // --- Helper to extract ID from customer paths ---
  const getCustomerIdFromPath = (path: string): string | null => {
    const match = path.match(/^\/customers\/([^\/]+)(?:\/edit)?$/)
    // Ensure it's not the 'new' page and has a potential ID
    return match && match[1] !== 'new' ? match[1] : null
  }
  const customerId = getCustomerIdFromPath(pathname)

  // Dashboard has no specific actions
  if (pathname === "/") {
    return null
  }

  // Determine if we're on a list page or a detail/edit page
  const isListPage = !pathname.includes("/new") && !pathname.match(/^\/customers\/[^\/]+\/edit$/) && !pathname.match(/^\/customers\/[^\/]+$/) && !pathname.match(/^\/invoices\/[^\/]+\/edit$/) // More specific list page check needed if detail pages exist for others
  const isCustomerListPage = pathname === "/customers"
  const isCustomerViewPage = !!customerId && !pathname.endsWith("/edit")
  const isCustomerEditPage = !!customerId && pathname.endsWith("/edit")
  const isCustomerNewPage = pathname === "/customers/new"

  // Add new item button for list pages
  // --- Render logic based on page type ---

  // 1. List Pages (Customers, Invoices, Quotes, Products)
  if (isCustomerListPage || (isListPage && !pathname.startsWith("/customers"))) { // Show "New" on customer list or other list pages
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

  // 2. Customer View Page
  if (isCustomerViewPage && customerId) {
    const handleDelete = () => {
      startTransition(async () => {
        const formData = new FormData()
        formData.append('publicCustomerId', customerId)
        const result: { error?: string; success?: boolean } | undefined = await deleteCustomer(formData)
        if (result?.error) {
          toast.error(`Failed to delete customer: ${result.error}`)
        } else {
          toast.success(`Customer deleted successfully.`)
          // Redirect happens in the action, but good practice to revalidate/push route if needed
          router.push("/customers") // Go back to list after delete
        }
      })
    }

    return (
      <div className="flex items-center gap-2">
        <Link href={`/customers/${customerId}/edit`} passHref legacyBehavior>
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will mark this customer as deleted. This cannot be undone easily.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {/* Use a form for the server action */}
              <form action={handleDelete}>
                 <AlertDialogAction type="submit" disabled={isPending}>
                   {isPending ? "Deleting..." : "Continue"}
                 </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // 3. Customer Edit or New Page - Don't show default top-bar actions for now
  if (isCustomerEditPage || isCustomerNewPage) {
    return null; // Form has its own save/update button
  }


  // 4. Other Edit/Detail Pages (Invoices, Quotes - keep existing logic for now)
  const isInvoice = pathname.startsWith("/invoices")
  const isQuote = pathname.startsWith("/quotes")
  const isDocument = isInvoice || isQuote

  return (
    <div className="flex items-center gap-2">
      {/* Keep generic Save button only if NOT a customer edit/new page */}
      {/* This might need further refinement based on Invoice/Quote edit flows */}
      {!isCustomerEditPage && !isCustomerNewPage && (
         <Button>
           <Save className="mr-2 h-4 w-4" />
           Save
         </Button>
      )}

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
