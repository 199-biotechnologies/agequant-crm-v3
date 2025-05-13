'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/use-toast'
import { InvoiceStatus, QuoteStatus } from '@/lib/constants'
import { 
  updateInvoiceStatus,
  deleteInvoice
} from '@/app/invoices/actions'
import {
  updateQuoteStatus,
  deleteQuote,
  convertQuoteToInvoice
} from '@/app/quotes/actions'
import { 
  ClipboardCheck, 
  MailCheck, 
  CreditCard, 
  Clock, 
  Ban,
  CheckCircle2,
  XCircle,
  Hourglass,
  RefreshCw,
  Trash2
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

// Types
type DocumentType = 'invoice' | 'quote'

interface StatusUpdaterProps {
  id: string
  currentStatus: string
  type: DocumentType
}

interface StatusOption {
  value: string
  label: string
  icon: React.ReactNode
  color: string
}

/**
 * Status options for invoices
 */
const invoiceStatusOptions: StatusOption[] = [
  { 
    value: 'Draft', 
    label: 'Mark as Draft', 
    icon: <ClipboardCheck className="mr-2 h-4 w-4" />,
    color: 'bg-gray-500/20 text-gray-700 hover:bg-gray-500/30'
  },
  { 
    value: 'Sent', 
    label: 'Mark as Sent', 
    icon: <MailCheck className="mr-2 h-4 w-4" />,
    color: 'bg-blue-500/20 text-blue-700 hover:bg-blue-500/30'
  },
  { 
    value: 'Paid', 
    label: 'Mark as Paid', 
    icon: <CreditCard className="mr-2 h-4 w-4" />,
    color: 'bg-green-500/20 text-green-700 hover:bg-green-500/30'
  },
  { 
    value: 'Overdue', 
    label: 'Mark as Overdue', 
    icon: <Clock className="mr-2 h-4 w-4" />,
    color: 'bg-orange-500/20 text-orange-700 hover:bg-orange-500/30'
  },
  { 
    value: 'Cancelled', 
    label: 'Mark as Cancelled', 
    icon: <Ban className="mr-2 h-4 w-4" />,
    color: 'bg-red-500/20 text-red-700 hover:bg-red-500/30'
  }
]

/**
 * Status options for quotes
 */
const quoteStatusOptions: StatusOption[] = [
  { 
    value: 'Draft', 
    label: 'Mark as Draft', 
    icon: <ClipboardCheck className="mr-2 h-4 w-4" />,
    color: 'bg-gray-500/20 text-gray-700 hover:bg-gray-500/30'
  },
  { 
    value: 'Sent', 
    label: 'Mark as Sent', 
    icon: <MailCheck className="mr-2 h-4 w-4" />,
    color: 'bg-blue-500/20 text-blue-700 hover:bg-blue-500/30'
  },
  { 
    value: 'Accepted', 
    label: 'Mark as Accepted', 
    icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
    color: 'bg-green-500/20 text-green-700 hover:bg-green-500/30'
  },
  { 
    value: 'Rejected', 
    label: 'Mark as Rejected', 
    icon: <XCircle className="mr-2 h-4 w-4" />,
    color: 'bg-red-500/20 text-red-700 hover:bg-red-500/30'
  },
  { 
    value: 'Expired', 
    label: 'Mark as Expired', 
    icon: <Hourglass className="mr-2 h-4 w-4" />,
    color: 'bg-orange-500/20 text-orange-700 hover:bg-orange-500/30'
  }
]

/**
 * Unified component for managing document status
 * Works with both invoices and quotes
 */
export function DocumentStatusUpdater({ id, currentStatus, type }: StatusUpdaterProps) {
  const router = useRouter()
  const [isStatusLoading, setIsStatusLoading] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [dueDate, setDueDate] = useState('')
  
  // Get the appropriate status options based on document type
  const statusOptions = type === 'invoice' ? invoiceStatusOptions : quoteStatusOptions
  
  // Update document status
  const updateStatus = async (status: string) => {
    setIsStatusLoading(true)
    
    try {
      let result
      
      // Handle different document types
      if (type === 'invoice') {
        result = await updateInvoiceStatus(id, status as InvoiceStatus)
      } else {
        result = await updateQuoteStatus(id, status as QuoteStatus)
      }
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Status Updated",
          description: `${type === 'invoice' ? 'Invoice' : 'Quote'} status has been updated.`
        })
      }
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive"
      })
    } finally {
      setIsStatusLoading(false)
    }
  }
  
  // Delete document
  const handleDelete = async () => {
    try {
      let result
      
      if (type === 'invoice') {
        result = await deleteInvoice(id)
      } else {
        result = await deleteQuote(id)
      }
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Deleted",
          description: `${type === 'invoice' ? 'Invoice' : 'Quote'} has been deleted.`
        })
        
        // Redirect to list page
        router.push(type === 'invoice' ? '/invoices' : '/quotes')
      }
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to delete document.",
        variant: "destructive"
      })
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }
  
  // Convert quote to invoice
  const handleConvertToInvoice = async () => {
    if (!dueDate) {
      toast({
        title: "Error",
        description: "Please select a due date.",
        variant: "destructive"
      })
      return
    }
    
    try {
      const result = await convertQuoteToInvoice(id, dueDate)
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Success",
          description: "Quote has been converted to invoice."
        })
        
        // Redirect to the new invoice
        router.push(`/invoices/${result.invoiceId}`)
      }
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to convert quote to invoice.",
        variant: "destructive"
      })
    } finally {
      setIsConvertDialogOpen(false)
    }
  }
  
  return (
    <div className="flex space-x-2">
      {/* Status dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[120px]" disabled={isStatusLoading}>
            Status: {currentStatus}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {statusOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              disabled={option.value === currentStatus}
              onClick={() => updateStatus(option.value)}
              className={option.value === currentStatus ? 'bg-accent' : ''}
            >
              {option.icon}
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Additional actions for quotes */}
      {type === 'quote' && currentStatus === 'Accepted' && (
        <Button 
          variant="outline"
          onClick={() => setIsConvertDialogOpen(true)}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Convert to Invoice
        </Button>
      )}
      
      {/* Delete button */}
      <Button 
        variant="destructive" 
        size="icon"
        onClick={() => setIsDeleteDialogOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this {type}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the {type} as deleted. This action can be reversed by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Convert to invoice dialog */}
      {type === 'quote' && (
        <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convert Quote to Invoice</DialogTitle>
              <DialogDescription>
                This will create a new invoice based on this quote.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConvertToInvoice}>
                Convert to Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}