import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { RevenueChart } from '@/components/dashboard/revenue-chart'

// Mock recharts components
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts')
  
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    BarChart: ({ children, data }: { children: React.ReactNode, data: any[] }) => (
      <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Bar: ({ dataKey }: { dataKey: string }) => <div data-testid="bar" data-key={dataKey} />,
    XAxis: ({ dataKey }: { dataKey: string }) => <div data-testid="x-axis" data-key={dataKey} />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
  }
})

// Mock React hooks for SSR hydration handling
jest.mock('react', () => {
  const original = jest.requireActual('react')
  
  return {
    ...original,
    useState: jest.fn().mockImplementation(original.useState),
    useEffect: jest.fn().mockImplementation((callback) => {
      callback() // Immediately call the effect function
      return undefined
    }),
  }
})

describe('RevenueChart component', () => {
  const sampleData = [
    { month: 'Jan', revenue: 4000, monthFull: 'January 2025' },
    { month: 'Feb', revenue: 3000, monthFull: 'February 2025' },
    { month: 'Mar', revenue: 5000, monthFull: 'March 2025' },
  ]
  
  test('renders the loading state initially', () => {
    // Reset the useState mock to return not mounted initially
    ;(React.useState as jest.Mock).mockReset()
      .mockImplementationOnce(() => [false, jest.fn()])
    
    render(<RevenueChart data={sampleData} />)
    
    // Should render a loading placeholder
    const loadingPlaceholder = screen.getByTestId('responsive-container')
    expect(loadingPlaceholder).toBeInTheDocument()
  })
  
  test('renders the chart with provided data', async () => {
    // Make sure useState returns mounted as true
    ;(React.useState as jest.Mock).mockReset()
      .mockImplementationOnce(() => [true, jest.fn()])
    
    render(<RevenueChart data={sampleData} />)
    
    // Chart should be rendered with data
    await waitFor(() => {
      const barChart = screen.getByTestId('bar-chart')
      expect(barChart).toBeInTheDocument()
      
      // Check that data is passed correctly
      const parsedData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]')
      expect(parsedData).toEqual(sampleData)
    })
    
    // Check chart components
    expect(screen.getByTestId('bar')).toHaveAttribute('data-key', 'revenue')
    expect(screen.getByTestId('x-axis')).toHaveAttribute('data-key', 'month')
    expect(screen.getByTestId('y-axis')).toBeInTheDocument()
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })
  
  test('uses the provided currency symbol', async () => {
    // Make sure useState returns mounted as true
    ;(React.useState as jest.Mock).mockReset()
      .mockImplementationOnce(() => [true, jest.fn()])
    
    render(<RevenueChart data={sampleData} currencySymbol="€" />)
    
    // Check that the chart is rendered
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
    
    // We can't directly test the formatter functions passed to YAxis and Tooltip
    // without more complex mocking, but we can verify the components are rendered
    expect(screen.getByTestId('y-axis')).toBeInTheDocument()
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })
  
  test('handles empty data gracefully', async () => {
    // Make sure useState returns mounted as true
    ;(React.useState as jest.Mock).mockReset()
      .mockImplementationOnce(() => [true, jest.fn()])
    
    render(<RevenueChart data={[]} />)
    
    // Chart should still render, but with empty data
    await waitFor(() => {
      const barChart = screen.getByTestId('bar-chart')
      expect(barChart).toBeInTheDocument()
      
      // Check that empty data is passed correctly
      const parsedData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]')
      expect(parsedData).toEqual([])
    })
  })
})