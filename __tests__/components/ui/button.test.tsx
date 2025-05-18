import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button component', () => {
  test('renders with default props', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    
    // Check for default styles
    expect(button).toHaveClass('bg-primary')
    expect(button).toHaveClass('text-primary-foreground')
  })
  
  test('applies variant styles correctly', () => {
    const { rerender } = render(<Button variant="destructive">Destructive</Button>)
    
    let button = screen.getByRole('button', { name: /destructive/i })
    expect(button).toHaveClass('bg-destructive')
    expect(button).toHaveClass('text-destructive-foreground')
    
    rerender(<Button variant="outline">Outline</Button>)
    button = screen.getByRole('button', { name: /outline/i })
    expect(button).toHaveClass('border')
    expect(button).toHaveClass('border-input')
    expect(button).toHaveClass('bg-background')
    
    rerender(<Button variant="secondary">Secondary</Button>)
    button = screen.getByRole('button', { name: /secondary/i })
    expect(button).toHaveClass('bg-secondary')
    expect(button).toHaveClass('text-secondary-foreground')
    
    rerender(<Button variant="ghost">Ghost</Button>)
    button = screen.getByRole('button', { name: /ghost/i })
    expect(button).toHaveClass('hover:bg-accent')
    
    rerender(<Button variant="link">Link</Button>)
    button = screen.getByRole('button', { name: /link/i })
    expect(button).toHaveClass('text-primary')
    expect(button).toHaveClass('hover:underline')
  })
  
  test('applies size styles correctly', () => {
    const { rerender } = render(<Button size="default">Default Size</Button>)
    
    let button = screen.getByRole('button', { name: /default size/i })
    expect(button).toHaveClass('h-10')
    expect(button).toHaveClass('px-4')
    expect(button).toHaveClass('py-2')
    
    rerender(<Button size="sm">Small</Button>)
    button = screen.getByRole('button', { name: /small/i })
    expect(button).toHaveClass('h-9')
    expect(button).toHaveClass('px-3')
    
    rerender(<Button size="lg">Large</Button>)
    button = screen.getByRole('button', { name: /large/i })
    expect(button).toHaveClass('h-11')
    expect(button).toHaveClass('px-8')
    
    rerender(<Button size="icon">Icon</Button>)
    button = screen.getByRole('button', { name: /icon/i })
    expect(button).toHaveClass('h-10')
    expect(button).toHaveClass('w-10')
  })
  
  test('applies additional className', () => {
    render(<Button className="custom-class">Custom</Button>)
    
    const button = screen.getByRole('button', { name: /custom/i })
    expect(button).toHaveClass('custom-class')
  })
  
  test('passes html attributes to button element', () => {
    render(
      <Button 
        type="submit" 
        disabled 
        aria-label="Submit form"
        data-testid="submit-button"
      >
        Submit
      </Button>
    )
    
    const button = screen.getByTestId('submit-button')
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-label', 'Submit form')
  })
  
  test('handles click events', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
  
  test('does not trigger click when disabled', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick} disabled>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)
    
    expect(handleClick).not.toHaveBeenCalled()
  })
  
  test('renders as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    
    const link = screen.getByRole('link', { name: /link button/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
    // Should have button styling even though it's an anchor
    expect(link).toHaveClass('bg-primary')
    expect(link).toHaveClass('text-primary-foreground')
  })
})