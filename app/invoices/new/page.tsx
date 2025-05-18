import { InvoiceForm } from "@/components/invoices/invoice-form"
import { getServerSupabaseClient } from "@/lib/supabase/server-client"
import { getAppSettings, getIssuingEntities, getPaymentSources } from "@/app/settings/actions"
import { format, addDays } from "date-fns"
import { Currency } from "@/lib/constants"

export default async function NewInvoicePage() {
  // Fetch all required data for the form
  const supabase = await getServerSupabaseClient()
  const settings = await getAppSettings()
  const issuingEntities = await getIssuingEntities()
  const paymentSources = await getPaymentSources()
  
  // Fetch customers
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id, public_customer_id, company_contact_name, preferred_currency')
    .is('deleted_at', null)
    .order('company_contact_name', { ascending: true })
  
  if (customersError) {
    console.error("Error fetching customers:", customersError)
    // Don't fail completely, just log the error
  }
  
  // Fetch products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id, 
      sku, 
      name, 
      description, 
      base_price, 
      unit, 
      status,
      additional_prices:product_additional_prices(*)
    `)
    .is('deleted_at', null)
    .order('name', { ascending: true })
  
  if (productsError) {
    console.error("Error fetching products:", productsError)
    // Don't fail completely, just log the error
  }
  
  // Calculate default due date from settings
  const today = new Date()
  const defaultDueDate = format(
    addDays(today, settings?.default_invoice_payment_terms_days || 30),
    'yyyy-MM-dd'
  )
  
  // If no entities or sources, the app is not properly configured
  if (!issuingEntities?.length || !paymentSources?.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Create New Invoice</h1>
        <div className="p-4 border rounded-md bg-yellow-50">
          <h3 className="text-lg font-semibold text-yellow-800">Setup Required</h3>
          <p className="mt-2">
            Please configure issuing entities and payment sources in the Settings area 
            before creating invoices.
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Create New Invoice</h1>
      <InvoiceForm 
        customers={customers || []}
        issuingEntities={issuingEntities}
        paymentSources={paymentSources}
        products={products || []}
        defaultCurrency={settings?.base_currency as Currency || 'USD'}
        defaultTaxPercentage={settings?.default_tax_percentage || 0}
        defaultDueDate={defaultDueDate}
      />
    </div>
  )
}