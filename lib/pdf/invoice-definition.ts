import { TDocumentDefinitions } from "pdfmake/interfaces";
import { InvoiceWithRelations } from "@/app/invoices/actions";
import { formatDateForDisplay, formatCurrencyForDisplay, getCommonStyles } from "./pdf-utils";

/**
 * Creates a PDF document definition for an invoice
 * 
 * @param invoice Invoice data with relations
 * @param companyLogo Optional base64 encoded company logo
 * @returns PDF document definition
 */
export function createInvoiceDefinition(
  invoice: InvoiceWithRelations,
  companyLogo?: string
): TDocumentDefinitions {
  const styles = getCommonStyles();
  
  return {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    
    // Metadata
    info: {
      title: `Invoice ${invoice.invoice_number || ""}`,
      author: "AgeQuant CRM",
      subject: `Invoice for ${invoice.customer.company_contact_name}`,
      creator: "AgeQuant CRM System",
    },
    
    // Default styling
    defaultStyle: {
      font: "Helvetica",
      fontSize: 10,
      lineHeight: 1.3,
    },
    
    // Styles
    styles,
    
    // Header with page numbers
    header: (currentPage, pageCount) => {
      return {
        text: `Page ${currentPage} of ${pageCount}`,
        alignment: "right",
        margin: [0, 20, 40, 0],
        style: "footer",
      };
    },
    
    // Footer with generation date
    footer: () => {
      return {
        text: `Generated on ${formatDateForDisplay(new Date())}`,
        style: "footer",
        margin: [40, 20, 40, 0],
      };
    },
    
    // Document content
    content: [
      // Main header with logo and title
      {
        columns: [
          // Company info/logo
          companyLogo ? {
            image: companyLogo,
            width: 150,
            alignment: "left",
          } : {
            text: invoice.entity.name,
            style: "header",
          },
          // Invoice title and number
          {
            stack: [
              { text: "INVOICE", style: "header", alignment: "right" },
              { 
                text: invoice.invoice_number ? 
                  `#${invoice.invoice_number}` : 
                  `#${invoice.id.substring(0, 8).toUpperCase()}`,
                alignment: "right",
                fontSize: 12
              }
            ]
          },
        ],
      },
      
      // Invoice information
      {
        columns: [
          // From section
          {
            width: "50%",
            stack: [
              { text: "From:", style: "subheader" },
              invoice.entity.name,
              "\n",
              { text: "To:", style: "subheader" },
              invoice.customer.company_contact_name,
              // Add address if available
              invoice.customer.address ? { text: invoice.customer.address, margin: [0, 5, 0, 0] } : "",
            ],
          },
          // Invoice details
          {
            width: "50%",
            alignment: "right",
            stack: [
              { text: "Invoice Details", style: "subheader" },
              { 
                layout: "noBorders",
                table: {
                  widths: ["auto", "*"],
                  body: [
                    [
                      { text: "Issue Date:", bold: true, alignment: "right" }, 
                      { text: formatDateForDisplay(invoice.issue_date), alignment: "right" }
                    ],
                    [
                      { text: "Due Date:", bold: true, alignment: "right" }, 
                      { text: formatDateForDisplay(invoice.due_date), alignment: "right" }
                    ],
                    [
                      { text: "Status:", bold: true, alignment: "right" }, 
                      { text: invoice.status, alignment: "right" }
                    ],
                    [
                      { text: "Currency:", bold: true, alignment: "right" }, 
                      { text: invoice.currency_code, alignment: "right" }
                    ],
                  ]
                }
              }
            ],
          },
        ],
        columnGap: 20,
        margin: [0, 20, 0, 20],
      },
      
      // Line items table
      {
        text: "Invoice Items",
        style: "subheader",
        margin: [0, 20, 0, 10],
      },
      {
        table: {
          // Define table layout
          headerRows: 1,
          widths: ["*", 50, 80, 80],
          
          // Ensure table headers repeat on each page
          keepWithHeaderRows: 1,
          
          // Define table content
          body: [
            // Table header
            [
              { text: "Description", style: "tableHeader" },
              { text: "Qty", style: "tableHeader", alignment: "center" },
              { text: "Unit Price", style: "tableHeader", alignment: "right" },
              { text: "Total", style: "tableHeader", alignment: "right" },
            ],
            
            // Table data rows
            ...invoice.items.map(item => [
              { text: item.description, style: "lineItem" },
              { text: item.quantity.toString(), style: "lineItem", alignment: "center" },
              { 
                text: formatCurrencyForDisplay(item.unit_price, invoice.currency_code),
                style: "lineItem",
                alignment: "right",
              },
              { 
                text: formatCurrencyForDisplay(item.quantity * item.unit_price, invoice.currency_code),
                style: "lineItem",
                alignment: "right",
              },
            ]),
          ],
        },
        layout: {
          // Custom table layout options
          hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => "#e5e7eb",
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
      },
      
      // Totals section
      {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            table: {
              widths: [100, 80],
              body: [
                [
                  { text: "Subtotal:", alignment: "right" },
                  { 
                    text: formatCurrencyForDisplay(invoice.subtotal_amount, invoice.currency_code),
                    alignment: "right",
                  },
                ],
                [
                  { text: `Tax (${invoice.tax_percentage}%):`, alignment: "right" },
                  { 
                    text: formatCurrencyForDisplay(invoice.tax_amount, invoice.currency_code),
                    alignment: "right",
                  },
                ],
                [
                  { text: "Total:", alignment: "right", bold: true },
                  { 
                    text: formatCurrencyForDisplay(invoice.total_amount, invoice.currency_code),
                    alignment: "right",
                    style: "totalAmount",
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0,
              hLineColor: () => "#e5e7eb",
              paddingTop: () => 6,
              paddingBottom: () => 6,
            },
            margin: [0, 10, 0, 0],
          },
        ],
      },
      
      // Notes section (if available)
      invoice.notes ? {
        stack: [
          { text: "Notes", style: "subheader", margin: [0, 20, 0, 5] },
          { text: invoice.notes, style: "notes" },
        ],
        margin: [0, 20, 0, 0],
      } : {},
      
      // Payment information
      {
        stack: [
          { text: "Payment Information", style: "subheader", margin: [0, 20, 0, 5] },
          { text: `Payment Method: ${invoice.payment_source.name}` },
          { text: `Payment is due by ${formatDateForDisplay(invoice.due_date)}.` },
        ],
        margin: [0, 20, 0, 0],
      },
    ],
  };
}