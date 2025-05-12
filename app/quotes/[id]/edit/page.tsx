import { notFound } from 'next/navigation';
import { getQuoteById, updateQuote } from '@/app/quotes/actions';
import { QuoteForm } from '@/components/quotes/quote-form';
// TODO: Import ActionButtons and configure for Quote Edit context

export default async function QuoteEditPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { quote, error } = await getQuoteById(id);

  if (error || !quote) {
    console.error("Error fetching quote for edit:", error);
    notFound(); // Triggers 404 page
  }

  // Bind the quote ID to the update action
  const updateQuoteWithId = updateQuote.bind(null, id);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Edit Quote {quote.quote_number || `#${id.substring(0, 6)}...`}
        </h1>
        {/* TODO: Add ActionButtons component here, configured for Quote Edit (e.g., Save, Cancel) */}
        <div>Save/Cancel Buttons Placeholder</div>
      </div>

      {/* Render the form with initial data and the update action */}
      <QuoteForm
        initialData={quote}
        onSubmitAction={updateQuoteWithId}
      />
    </div>
  );
}
