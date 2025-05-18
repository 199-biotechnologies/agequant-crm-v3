import { 
  handleValidationError, 
  handleDatabaseError, 
  showErrorToast, 
  showSuccessToast 
} from '@/lib/utils/error-handler'
import { ZodError, z } from 'zod'
import { toast } from 'sonner'

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}))

// Mock console.error
console.error = jest.fn()

describe('Error Handler Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('handleValidationError', () => {
    test('formats Zod validation errors correctly', () => {
      // Create a sample schema
      const schema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
      })

      // Generate a validation error
      let zodError: ZodError
      try {
        schema.parse({ name: 'A', email: 'not-an-email' })
      } catch (error) {
        zodError = error as ZodError
        
        // Handle the validation error
        const result = handleValidationError(zodError, 'customer')
        
        // Check the result format
        expect(result).toEqual({
          error: 'Invalid customer data. Please check the fields.',
          fieldErrors: expect.objectContaining({
            name: expect.any(Array),
            email: expect.any(Array),
          }),
        })
        
        // Verify console.error was called
        expect(console.error).toHaveBeenCalledWith(
          'Validation Error (customer):', 
          expect.objectContaining({
            name: expect.any(Array),
            email: expect.any(Array),
          })
        )
      }
    })
  })

  describe('handleDatabaseError', () => {
    test('handles unique constraint error (23505)', () => {
      const dbError = { code: '23505', message: 'duplicate key value violates unique constraint' }
      
      const result = handleDatabaseError(dbError, 'create', 'customer')
      
      expect(result).toEqual({
        error: 'This customer already exists. Please try a different name or identifier.',
        code: '23505'
      })
    })

    test('handles foreign key constraint error (23503)', () => {
      const dbError = { code: '23503', message: 'foreign key constraint violation' }
      
      const result = handleDatabaseError(dbError, 'delete', 'product')
      
      expect(result).toEqual({
        error: 'This product is referenced by other records and cannot be deleted.',
        code: '23503'
      })
    })

    test('handles generic error with default message', () => {
      const dbError = { message: 'Internal Server Error' }
      
      const result = handleDatabaseError(dbError, 'update', 'invoice')
      
      expect(result).toEqual({
        error: 'Database Error: Internal Server Error',
        code: undefined
      })
    })

    test('provides fallback for completely unknown errors', () => {
      const dbError = {}
      
      const result = handleDatabaseError(dbError, 'query', 'quote')
      
      expect(result).toEqual({
        error: 'Database Error: An unexpected error occurred',
        code: undefined
      })
    })
  })

  describe('showErrorToast', () => {
    test('displays error toast with field errors', () => {
      const errorResponse = {
        error: 'Validation failed',
        fieldErrors: { name: ['Name is required'] }
      }
      
      showErrorToast(errorResponse)
      
      expect(toast.error).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          description: 'Please correct the highlighted fields.',
          duration: 5000
        })
      )
    })

    test('displays error toast without field errors', () => {
      const errorResponse = {
        error: 'Database connection failed',
        code: 'CONN_ERROR'
      }
      
      showErrorToast(errorResponse)
      
      expect(toast.error).toHaveBeenCalledWith(
        'Database connection failed',
        expect.objectContaining({
          description: undefined,
          duration: 5000
        })
      )
    })
  })

  describe('showSuccessToast', () => {
    test('displays success toast with description', () => {
      showSuccessToast('Operation completed', 'Your data has been saved')
      
      expect(toast.success).toHaveBeenCalledWith(
        'Operation completed',
        expect.objectContaining({
          description: 'Your data has been saved',
          duration: 3000
        })
      )
    })

    test('displays success toast without description', () => {
      showSuccessToast('Operation completed')
      
      expect(toast.success).toHaveBeenCalledWith(
        'Operation completed',
        expect.objectContaining({
          description: undefined,
          duration: 3000
        })
      )
    })
  })
})