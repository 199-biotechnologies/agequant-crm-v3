import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerForm } from '@/components/customers/customer-form'

// Mock the next/navigation module
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock the server action
const mockServerAction = jest.fn()

describe('CustomerForm component', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  test('renders with empty form fields by default', () => {
    render(<CustomerForm serverAction={mockServerAction} />)
    
    // Check that all form fields are present
    expect(screen.getByLabelText(/company \/ contact name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/preferred currency/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/internal notes/i)).toBeInTheDocument()
    
    // Check that submit and cancel buttons are rendered
    expect(screen.getByRole('button', { name: /save customer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })
  
  test('renders with initial data when provided', () => {
    const initialData = {
      company_contact_name: 'Acme Corp',
      email: 'contact@acme.com',
      phone: '555-123-4567',
      preferred_currency: 'USD',
      address: '123 Main St',
      notes: 'Test notes',
      public_customer_id: 'CUST-123'
    }
    
    render(<CustomerForm initialData={initialData} serverAction={mockServerAction} />)
    
    // Check that fields are populated with initial data
    expect(screen.getByLabelText(/company \/ contact name/i)).toHaveValue('Acme Corp')
    expect(screen.getByLabelText(/email/i)).toHaveValue('contact@acme.com')
    expect(screen.getByLabelText(/phone/i)).toHaveValue('555-123-4567')
    // SelectValue is harder to check, but we can verify it's in the document
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByLabelText(/address/i)).toHaveValue('123 Main St')
    expect(screen.getByLabelText(/internal notes/i)).toHaveValue('Test notes')
    
    // Check that the submit button text is different for editing
    expect(screen.getByRole('button', { name: /update customer/i })).toBeInTheDocument()
    
    // Check that the hidden input for the customer ID exists
    const hiddenInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement
    expect(hiddenInput).toHaveValue('CUST-123')
  })
  
  test('validates required fields when form is submitted', async () => {
    render(<CustomerForm serverAction={mockServerAction} />)
    
    // Try to submit the form without filling required fields
    const submitButton = screen.getByRole('button', { name: /save customer/i })
    await user.click(submitButton)
    
    // Wait for validation errors to appear
    await waitFor(() => {
      expect(screen.getByText(/company\/contact name is required/i)).toBeInTheDocument()
    })
    
    // No server action should be called if validation fails
    expect(mockServerAction).not.toHaveBeenCalled()
  })
  
  test('handles form submission with valid data', async () => {
    // Need to mock the form submission which uses FormData
    const originalSubmit = window.HTMLFormElement.prototype.submit
    window.HTMLFormElement.prototype.submit = jest.fn()
    
    try {
      render(<CustomerForm serverAction={mockServerAction} />)
      
      // Fill out the form
      await user.type(screen.getByLabelText(/company \/ contact name/i), 'Test Company')
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/phone/i), '555-987-6543')
      
      // Select a currency (more complex due to the Select component)
      await user.click(screen.getByRole('combobox', { name: /preferred currency/i }))
      await user.click(screen.getByRole('option', { name: 'USD' }))
      
      await user.type(screen.getByLabelText(/address/i), '456 Test Street')
      await user.type(screen.getByLabelText(/internal notes/i), 'Some test notes')
      
      // Submit the form
      const submitButton = screen.getByRole('button', { name: /save customer/i })
      await user.click(submitButton)
      
      // Since this is a native form submission that we've mocked,
      // we can verify the form was valid
      await waitFor(() => {
        expect(window.HTMLFormElement.prototype.submit).toHaveBeenCalled()
      })
    } finally {
      // Restore the original submit function
      window.HTMLFormElement.prototype.submit = originalSubmit
    }
  })
  
  test('handles cancel button click', async () => {
    const pushMock = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockImplementation(() => ({
      push: pushMock,
    }))
    
    render(<CustomerForm serverAction={mockServerAction} />)
    
    // Click the cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    // Verify that the router was called to navigate back to the customers list
    expect(pushMock).toHaveBeenCalledWith('/customers')
  })
})