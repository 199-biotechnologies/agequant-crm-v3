'use client'

import { useState, useEffect } from 'react'
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { LineItemFormValues } from '@/lib/schemas/financial-documents'
import { calculateLineItemTotal, formatCurrency } from '@/lib/utils/financial-document-utils'
import { useToast } from '@/components/ui/use-toast'
import { Currency } from '@/lib/constants'

interface Product {
  id: string
  sku: string
  name: string
  base_price: number
  base_currency: string
  unit: string
  additional_prices?: {
    currency_code: string
    price: number
  }[]
}

interface LineItemEditorProps {
  value: LineItemFormValues[]
  onChange: (items: LineItemFormValues[]) => void
  currency: Currency
  products: Product[]
  disabled?: boolean
}

/**
 * A reusable line item editor component for financial documents.
 * Used in both invoice and quote forms.
 */
export function LineItemEditor({
  value = [],
  onChange,
  currency,
  products,
  disabled = false
}: LineItemEditorProps) {
  const { toast } = useToast()
  const [lineItems, setLineItems] = useState<LineItemFormValues[]>(value)
  // State to track loading status of FX rate fetch
  const [_isLoadingFx, setIsLoadingFx] = useState(false)

  // Update parent form when line items change
  useEffect(() => {
    onChange(lineItems)
  }, [lineItems, onChange])

  // Sync with parent form when value prop changes
  useEffect(() => {
    setLineItems(value)
  }, [value])

  // Function to fetch FX rate from API
  const fetchFxRate = async (baseCurrency: string, targetCurrency: string): Promise<number | null> => {
    if (baseCurrency === targetCurrency) return 1 // Same currency
    
    setIsLoadingFx(true)
    try {
      const response = await fetch(`/api/fx?from=${baseCurrency}&to=${targetCurrency}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch FX rate: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.rate || null
    } catch (error) {
      console.error('Error fetching FX rate:', error)
      toast({
        title: "Error",
        description: "Failed to fetch exchange rate. Using default price.",
        variant: "destructive"
      })
      return null
    } finally {
      setIsLoadingFx(false)
    }
  }

  // Add a new empty line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        productId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        fxRate: undefined // Add fxRate field with undefined value
      }
    ])
  }

  // Remove a line item at a given index
  const removeLineItem = (index: number) => {
    const newItems = [...lineItems]
    newItems.splice(index, 1)
    setLineItems(newItems)
  }

  // Update a field in a line item
  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...lineItems]
    newItems[index] = {
      ...newItems[index],
      [field]: value
    }
    setLineItems(newItems)
  }

  // Get product price based on currency and calculate FX rate
  const getProductPrice = (product: Product | undefined, currencyCode: Currency): { price: number, fxRate?: number } => {
    if (!product) return { price: 0 }
    
    // For base currency, use base_price (no FX rate needed)
    if (currencyCode === product.base_currency) {
      return { price: product.base_price }
    }
    
    // For other currencies, look in additional_prices
    const priceInCurrency = product.additional_prices?.find(
      p => p.currency_code === currencyCode
    )
    
    if (priceInCurrency?.price) {
      // Calculate FX rate if we have a price in the target currency
      const fxRate = priceInCurrency.price / product.base_price
      return { price: priceInCurrency.price, fxRate }
    }
    
    // No price found in this currency
    return { price: 0 }
  }

  // Handle product selection change
  const handleProductChange = async (index: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    
    const { price, fxRate } = getProductPrice(product, currency)
    
    updateLineItem(index, 'productId', productId)
    updateLineItem(index, 'description', product.name)
    updateLineItem(index, 'unitPrice', price)
    
    // If we have a calculated FX rate, use it
    if (fxRate) {
      updateLineItem(index, 'fxRate', fxRate)
    } 
    // If we don't have a price in the target currency but the currencies are different,
    // try to fetch the FX rate from the API
    else if (currency !== product.base_currency && price === 0) {
      const fetchedRate = await fetchFxRate(product.base_currency, currency)
      
      if (fetchedRate) {
        // Use the FX rate to calculate the price in the target currency
        const convertedPrice = product.base_price * fetchedRate
        updateLineItem(index, 'unitPrice', convertedPrice)
        updateLineItem(index, 'fxRate', fetchedRate)
      } else {
        // No rate available, show warning
        toast({
          title: "Warning",
          description: `No price defined for ${product.name} in ${currency} and couldn't fetch exchange rate.`,
          variant: "destructive"
        })
      }
    }
    
    // If no price in selected currency, show warning
    if (price === 0 && productId && currency !== product.base_currency) {
      toast({
        title: "Warning",
        description: `No price defined for ${product.name} in ${currency}. Using exchange rate if available.`,
        variant: "warning"
      })
    }
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Product</TableHead>
            <TableHead className="w-[300px]">Description</TableHead>
            <TableHead className="w-[100px]">Quantity</TableHead>
            <TableHead className="w-[150px]">Unit Price</TableHead>
            <TableHead className="w-[150px]">Total</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineItems.map((item, index) => {
            const total = calculateLineItemTotal(item.quantity, item.unitPrice)
            
            return (
              <TableRow key={index}>
                <TableCell>
                  <Select
                    value={item.productId}
                    onValueChange={(value) => handleProductChange(index, value)}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    placeholder="Description"
                    disabled={disabled}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    disabled={disabled}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                  />
                </TableCell>
                <TableCell>
                  {formatCurrency(total, currency)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    disabled={disabled || lineItems.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addLineItem}
        disabled={disabled}
        className="mt-2"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Item
      </Button>
    </div>
  )
}