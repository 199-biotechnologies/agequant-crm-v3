import { ProductForm } from "@/components/products/product-form";
import { createProduct } from "@/app/products/actions";
// Removed AppLayout import as it's applied by the root layout

export default function NewProductPage() {
  return (
    // Removed AppLayout wrapper
    <div className="space-y-6 py-6"> {/* Added padding */}
      <h1 className="text-3xl font-bold tracking-tight">Create New Product</h1>
      <ProductForm serverAction={createProduct} />
    </div>
    // Removed AppLayout wrapper
  );
}