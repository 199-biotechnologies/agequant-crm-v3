'use client'

import { useState, useEffect } from 'react'
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Check, ChevronsUpDown, Store, CreditCard, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Currency } from '@/lib/constants'

// Common interface for entities with id and name
interface EntityBase {
  id: string
  name: string
}

// Customer interface
export interface Customer {
  id: string
  public_customer_id: string
  company_contact_name: string
  preferred_currency: Currency
}

// Issuing entity interface
export interface IssuingEntity extends EntityBase {
  address: string
}

// Payment source interface
export interface PaymentSource extends EntityBase {
  description?: string
}

// Base selector props
interface BaseSelectorProps<T> {
  value: string
  onValueChange: (value: string) => void
  items: T[]
  disabled?: boolean
  placeholder?: string
  emptyMessage?: string
}

/**
 * Customer selector component
 */
export function CustomerSelector({
  value,
  onValueChange,
  items,
  disabled = false,
  placeholder = "Select customer",
  emptyMessage = "No customers found"
}: BaseSelectorProps<Customer>) {
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string>('')

  // Find selected customer and set label
  useEffect(() => {
    if (value) {
      const selectedCustomer = items.find(item => item.id === value)
      if (selectedCustomer) {
        setSelectedLabel(selectedCustomer.company_contact_name)
      }
    } else {
      setSelectedLabel('')
    }
  }, [value, items])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedLabel || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search customer..." />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup>
            <CommandList>
              {items.map(customer => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={() => {
                    onValueChange(customer.id)
                    setOpen(false)
                  }}
                >
                  <Store className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{customer.company_contact_name}</span>
                    <span className="text-xs text-muted-foreground">
                      ID: {customer.public_customer_id} • Currency: {customer.preferred_currency}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === customer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Issuing entity selector component
 */
export function IssuingEntitySelector({
  value,
  onValueChange,
  items,
  disabled = false,
  placeholder = "Select issuing entity",
  emptyMessage = "No issuing entities found"
}: BaseSelectorProps<IssuingEntity>) {
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string>('')

  // Find selected entity and set label
  useEffect(() => {
    if (value) {
      const selectedEntity = items.find(item => item.id === value)
      if (selectedEntity) {
        setSelectedLabel(selectedEntity.name)
      }
    } else {
      setSelectedLabel('')
    }
  }, [value, items])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedLabel || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search entity..." />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup>
            <CommandList>
              {items.map(entity => (
                <CommandItem
                  key={entity.id}
                  value={entity.id}
                  onSelect={() => {
                    onValueChange(entity.id)
                    setOpen(false)
                  }}
                >
                  <Building className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{entity.name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                      {entity.address}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === entity.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Payment source selector component
 */
export function PaymentSourceSelector({
  value,
  onValueChange,
  items,
  disabled = false,
  placeholder = "Select payment source",
  emptyMessage = "No payment sources found"
}: BaseSelectorProps<PaymentSource>) {
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string>('')

  // Find selected payment source and set label
  useEffect(() => {
    if (value) {
      const selectedSource = items.find(item => item.id === value)
      if (selectedSource) {
        setSelectedLabel(selectedSource.name)
      }
    } else {
      setSelectedLabel('')
    }
  }, [value, items])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedLabel || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search payment source..." />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup>
            <CommandList>
              {items.map(source => (
                <CommandItem
                  key={source.id}
                  value={source.id}
                  onSelect={() => {
                    onValueChange(source.id)
                    setOpen(false)
                  }}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{source.name}</span>
                    {source.description && (
                      <span className="text-xs text-muted-foreground">
                        {source.description}
                      </span>
                    )}
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === source.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}