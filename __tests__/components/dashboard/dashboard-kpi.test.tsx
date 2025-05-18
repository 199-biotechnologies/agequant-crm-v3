import React from 'react'
import { render, screen } from '@testing-library/react'
import { DashboardKPI } from '@/components/dashboard/dashboard-kpi'
import { Dollar } from 'lucide-react'

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode, href: string }) => {
    return <a href={href}>{children}</a>
  }
})

describe('DashboardKPI component', () => {
  test('renders with required props', () => {
    render(
      <DashboardKPI
        title="Total Revenue"
        value="$10,000"
        icon={Dollar}
        href="/revenue"
      />
    )
    
    // Check title, value, and link
    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('$10,000')).toBeInTheDocument()
    
    // Check the link
    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/revenue')
  })
  
  test('renders with secondary value when provided', () => {
    render(
      <DashboardKPI
        title="Top Product"
        value="Widget X"
        secondaryValue="$5,000"
        icon={Dollar}
        href="/products"
      />
    )
    
    // Check primary and secondary values
    expect(screen.getByText('Widget X')).toBeInTheDocument()
    expect(screen.getByText('$5,000')).toBeInTheDocument()
  })
  
  test('renders the icon', () => {
    render(
      <DashboardKPI
        title="Monthly Sales"
        value="250 units"
        icon={Dollar}
        href="/sales"
      />
    )
    
    // Check for icon presence by checking its parent element structure
    // Since the icon is rendered as an SVG, direct testing is tricky
    const iconParent = screen.getByText('Monthly Sales').parentElement
    expect(iconParent).toContainHTML('svg')
  })
  
  test('has hover styling for better UX', () => {
    render(
      <DashboardKPI
        title="Customers"
        value="150"
        icon={Dollar}
        href="/customers"
      />
    )
    
    // Check for hover styling classes
    const card = screen.getByText('Customers').closest('.hover\\:shadow-md')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('transition-all')
  })
  
  test('uses appropriate typography for hierarchy', () => {
    render(
      <DashboardKPI
        title="Conversions"
        value="25%"
        icon={Dollar}
        href="/conversions"
      />
    )
    
    // Check for appropriate typography classes
    const title = screen.getByText('Conversions')
    expect(title).toHaveClass('text-sm')
    expect(title).toHaveClass('font-medium')
    expect(title).toHaveClass('text-muted-foreground')
    
    const value = screen.getByText('25%')
    expect(value).toHaveClass('text-2xl')
    expect(value).toHaveClass('font-bold')
  })
})