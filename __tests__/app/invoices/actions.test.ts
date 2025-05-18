import { 
  getInvoiceById, 
  createInvoice, 
  updateInvoice, 
  deleteInvoice, 
  updateInvoiceStatus 
} from '@/app/invoices/actions'
import { getServerSupabaseClient } from '@/lib/supabase/server-client'
import { handleValidationError, handleDatabaseError } from '@/lib/utils/error-handler'
import { revalidatePath, redirect } from 'next/cache'

// Mock dependencies
jest.mock('@/lib/supabase/server-client')
jest.mock('@/lib/utils/error-handler')
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  redirect: jest.fn(),
}))

describe('Invoice actions', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock implementation
    ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      rpc: jest.fn().mockReturnThis()
    })
  })
  
  describe('getInvoiceById', () => {
    test('returns null when invalid ID is provided', async () => {
      const result = await getInvoiceById('')
      expect(result).toBeNull()
    })
    
    test('returns null when invoice is not found', async () => {
      // Setup mock to return no data
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      })
      
      const result = await getInvoiceById('invalid-id')
      expect(result).toBeNull()
    })
    
    test('returns invoice data when found', async () => {
      // Setup mock to return invoice data
      const mockInvoice = {
        id: '123',
        customer: { id: 'cust-1', public_customer_id: 'CUST-123', company_contact_name: 'Acme Corp' },
        entity: { id: 'entity-1', name: 'My Company' },
        payment_source: { id: 'payment-1', name: 'Bank Transfer' },
        items: [{ id: 'item-1', product_id: 'prod-1', description: 'Test Item', quantity: 1, unit_price: 100 }]
      }
      
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockInvoice, error: null })
      })
      
      const result = await getInvoiceById('123')
      expect(result).toEqual(mockInvoice)
    })
    
    test('handles database errors', async () => {
      // Setup mock to return an error
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
      })
      
      // Spy on console.error
      jest.spyOn(console, 'error').mockImplementation(() => {})
      
      const result = await getInvoiceById('123')
      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalled()
    })
  })
  
  describe('createInvoice', () => {
    test('validates form data before submission', async () => {
      // Setup mock form data
      const formData = new FormData()
      formData.append('customerId', '')
      
      // Setup validation error mock
      ;(handleValidationError as jest.Mock).mockReturnValue({ error: 'Validation failed' })
      
      const result = await createInvoice(formData)
      expect(result).toEqual({ error: 'Validation failed' })
    })
    
    test('calls RPC function with validated data', async () => {
      // Setup mock form data for a valid invoice
      const formData = new FormData()
      formData.append('customerId', 'cust-1')
      formData.append('entityId', 'entity-1')
      formData.append('issueDate', '2025-05-15')
      formData.append('dueDate', '2025-06-15')
      formData.append('currency', 'USD')
      formData.append('paymentSourceId', 'payment-1')
      formData.append('taxPercent', '10')
      formData.append('notes', 'Test notes')
      formData.append('lineItems[0][productId]', 'prod-1')
      formData.append('lineItems[0][description]', 'Product 1')
      formData.append('lineItems[0][quantity]', '2')
      formData.append('lineItems[0][unitPrice]', '100')
      formData.append('lineItems[0][fxRate]', '1')
      
      // Mock RPC response
      const mockRpcResponse = {
        data: { success: true, id: 'new-invoice-123' },
        error: null
      }
      
      const rpcMock = jest.fn().mockResolvedValue(mockRpcResponse)
      
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        rpc: rpcMock
      })
      
      await createInvoice(formData)
      
      // Check that RPC was called with correct function name
      expect(rpcMock).toHaveBeenCalledWith('create_invoice_with_items', expect.any(Object))
      
      // Check path revalidation and redirect
      expect(revalidatePath).toHaveBeenCalledWith('/invoices')
      expect(redirect).toHaveBeenCalledWith('/invoices/new-invoice-123')
    })
    
    test('handles RPC errors', async () => {
      const formData = new FormData()
      // Setup same fields as before...
      
      // Mock RPC error response
      const rpcMock = jest.fn().mockResolvedValue({
        data: { success: false, error: 'RPC error' },
        error: null
      })
      
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        rpc: rpcMock
      })
      
      // Spy on console.error
      jest.spyOn(console, 'error').mockImplementation(() => {})
      
      const result = await createInvoice(formData)
      expect(result).toEqual({ error: expect.any(String) })
      expect(console.error).toHaveBeenCalled()
    })
  })
  
  describe('updateInvoiceStatus', () => {
    test('updates invoice status successfully', async () => {
      // Mock Supabase update response
      const updateMock = jest.fn().mockResolvedValue({ error: null })
      
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: updateMock
      })
      
      const result = await updateInvoiceStatus('invoice-123', 'Paid')
      
      expect(result).toEqual({ success: true })
      expect(revalidatePath).toHaveBeenCalledWith('/invoices')
      expect(revalidatePath).toHaveBeenCalledWith('/invoices/invoice-123')
    })
    
    test('handles errors during status update', async () => {
      // Mock database error
      const dbError = { message: 'Update failed' }
      
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: dbError })
      })
      
      ;(handleDatabaseError as jest.Mock).mockReturnValue({ 
        error: 'Database error during status update' 
      })
      
      const result = await updateInvoiceStatus('invoice-123', 'Paid')
      
      expect(result).toEqual({ error: expect.any(String) })
      expect(handleDatabaseError).toHaveBeenCalledWith(
        dbError, 
        'update status', 
        'invoice'
      )
    })
    
    test('validates invoice ID', async () => {
      const result = await updateInvoiceStatus('', 'Paid')
      expect(result).toEqual({ error: 'Invalid invoice ID.' })
    })
  })
  
  describe('deleteInvoice', () => {
    test('soft deletes an invoice', async () => {
      // Mock Supabase update response for soft delete
      const updateMock = jest.fn().mockResolvedValue({ error: null })
      
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: updateMock
      })
      
      const result = await deleteInvoice('invoice-123')
      
      expect(result).toEqual({ success: true })
      expect(revalidatePath).toHaveBeenCalledWith('/invoices')
    })
    
    test('handles errors during deletion', async () => {
      // Mock database error
      const dbError = { message: 'Delete failed' }
      
      ;(getServerSupabaseClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: dbError })
      })
      
      ;(handleDatabaseError as jest.Mock).mockReturnValue({ 
        error: 'Database error during deletion' 
      })
      
      const result = await deleteInvoice('invoice-123')
      
      expect(result).toEqual({ error: expect.any(String) })
      expect(handleDatabaseError).toHaveBeenCalledWith(
        dbError, 
        'delete', 
        'invoice'
      )
    })
    
    test('validates invoice ID', async () => {
      const result = await deleteInvoice('')
      expect(result).toEqual({ error: 'Invalid invoice ID.' })
    })
  })
})