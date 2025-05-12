import { QuoteForm } from "@/components/quotes/quote-form"; // Path to the form component we will create

export default function NewQuotePage() {
  // TODO: Fetch necessary data server-side if QuoteForm becomes a server component
  // or pass props if QuoteForm remains a client component needing initial data.
  // For now, assuming QuoteForm handles its data fetching or receives props.

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Create New Quote</h1>
      {/* Render the QuoteForm component */}
      <QuoteForm />
    </div>
  );
}
