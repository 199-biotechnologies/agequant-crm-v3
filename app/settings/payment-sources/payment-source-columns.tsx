'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { type PaymentSource } from '@/app/settings/types';

// TODO: Need a way to display Issuing Entity Name instead of just ID in the main column.
// This might require enhancing the PaymentSource type or fetching related data.

interface PaymentSourceColumnsProps {
  handleSetPrimary: (sourceId: string, entityId: string) => void;
  handleEdit: (source: PaymentSource) => void;
  openDeleteConfirm: (source: PaymentSource) => void;
}

export const getColumns = ({
  handleSetPrimary,
  handleEdit,
  openDeleteConfirm,
}: PaymentSourceColumnsProps): ColumnDef<PaymentSource>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'currency_code',
    header: 'Currency',
  },
  {
    // TODO: This should ideally show the entity name, not the ID.
    // This might require fetching entities alongside sources or joining data server-side.
    // For now, displaying the ID as a placeholder.
    accessorKey: 'issuing_entity_id',
    header: 'Issuing Entity (ID)',
    cell: ({ row }) => <div className="text-xs text-muted-foreground">{row.getValue('issuing_entity_id')}</div>,
  },
  {
    accessorKey: 'bank_name',
    header: 'Bank Name',
    cell: ({ row }) => row.getValue('bank_name') || <span className="text-muted-foreground">N/A</span>,
  },
  {
    accessorKey: 'account_holder_name',
    header: 'Account Holder',
    cell: ({ row }) => row.getValue('account_holder_name') || <span className="text-muted-foreground">N/A</span>,
  },
  {
    accessorKey: 'account_number', // Displaying primary account identifier
    header: 'Account #',
    cell: ({ row }) => row.getValue('account_number') || <span className="text-muted-foreground">N/A</span>,
  },
  {
    accessorKey: 'iban',
    header: 'IBAN',
    cell: ({ row }) => row.getValue('iban') || <span className="text-muted-foreground">N/A</span>,
  },
  {
    accessorKey: 'swift_bic',
    header: 'SWIFT/BIC',
    cell: ({ row }) => row.getValue('swift_bic') || <span className="text-muted-foreground">N/A</span>,
  },
  {
    accessorKey: 'is_primary_for_entity',
    header: 'Primary (for Entity)',
    cell: ({ row }) => {
      const isPrimary = row.getValue('is_primary_for_entity');
      return isPrimary ? <Badge variant="secondary">Primary</Badge> : null;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: false,
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const source = row.original;

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(source.id)}
              >
                Copy Source ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!source.is_primary_for_entity && (
                <DropdownMenuItem onClick={() => handleSetPrimary(source.id, source.issuing_entity_id)}>
                  Set as Primary (for Entity)
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleEdit(source)}>
                Edit Source
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDeleteConfirm(source)}
                className="text-red-600 hover:!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-700/50"
              >
                Delete Source
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    enableSorting: false,
  },
];
