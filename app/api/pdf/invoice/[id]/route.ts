import { NextRequest, NextResponse } from 'next/server';
import PdfPrinter from 'pdfmake';

import { getInvoiceById } from '@/app/invoices/actions';
import { createInvoiceDefinition } from '@/lib/pdf/invoice-definition';

// Route configuration for Next.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Specify Node.js runtime environment

// Define fonts
const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  },
  // Fallback to Roboto which is included with pdfmake
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
};

/**
 * API route to generate and download an invoice PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get invoice data
    const invoice = await getInvoiceById(params.id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Create document definition
    const docDefinition = createInvoiceDefinition(invoice);
    
    // Initialize the PDF printer with fonts
    const printer = new PdfPrinter(fonts);
    
    // Create PDF document
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    // Buffer to collect PDF data
    const chunks: Buffer[] = [];
    
    // Collect data chunks
    pdfDoc.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    
    // Return the completed PDF
    return new Promise<NextResponse>((resolve) => {
      pdfDoc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        
        // Generate a meaningful filename
        const invoiceNumber = invoice.invoice_number || 
          `INV-${invoice.id.substring(0, 8).toUpperCase()}`;
          
        const filename = `${invoiceNumber}-${invoice.customer.company_contact_name.replace(/\s+/g, '_')}.pdf`;
        
        // Return PDF with appropriate headers
        resolve(new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length.toString(),
          },
        }));
      });
      
      // End the document to trigger the 'end' event
      pdfDoc.end();
    });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}