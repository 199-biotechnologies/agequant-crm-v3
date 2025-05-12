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
import { type IssuingEntity } from '@/app/settings/types';

// Removed duplicate import of IssuingEntity

interface IssuingEntityColumnsProps {
  handleSetPrimary: (entityId: string) => void;
  handleEdit: (entity: IssuingEntity) => void; // Pass the whole entity for editing
  openDeleteConfirm: (entity: IssuingEntity) => void;
}

export const getColumns = ({
  handleSetPrimary,
  handleEdit,
  openDeleteConfirm,
}: IssuingEntityColumnsProps): ColumnDef<IssuingEntity>[] => [
  {
    accessorKey: 'entity_name',
    header: 'Entity Name',
    cell: ({ row }) => <div className="font-medium">{row.getValue('entity_name')}</div>,
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => row.getValue('phone') || <span className="text-muted-foreground">N/A</span>,
  },
  {
    accessorKey: 'website',
    header: 'Website',
    cell: ({ row }) => {
      const website = row.getValue('website') as string | null;
      return website ? (
        <a href={website.startsWith('http') ? website : `//${website}`} target="_blank" rel="noopener noreferrer" className="underline">
          {website}
        </a>
      ) : (
        <span className="text-muted-foreground">N/A</span>
      );
    },
  },
  {
    accessorKey: 'registration_number',
    header: 'Reg. Number',
    cell: ({ row }) => row.getValue('registration_number') || <span className="text-muted-foreground">N/A</span>,
  },
  {
    accessorKey: 'address',
    header: 'Address',
    cell: ({ row }) => {
      const address = row.getValue('address') as string | null;
      // Simple display, could be truncated or use a tooltip for long addresses
      return <div className="text-sm text-muted-foreground truncate max-w-xs" title={address || ''}>{address || 'N/A'}</div>;
    }
  },
  {
    accessorKey: 'is_primary',
    header: 'Primary',
    cell: ({ row }) => {
      const isPrimary = row.getValue('is_primary');
      return isPrimary ? <Badge variant="secondary">Primary</Badge> : null;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: false, // Usually don't sort by boolean badges like this
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const entity = row.original;

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
                onClick={() => navigator.clipboard.writeText(entity.id)}
              >
                Copy Entity ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!entity.is_primary && (
                <DropdownMenuItem onClick={() => handleSetPrimary(entity.id)}>
                  Set as Primary
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleEdit(entity)}>
                Edit Entity
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDeleteConfirm(entity)}
                className="text-red-600 hover:!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-700/50"
              >
                Delete Entity
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    enableSorting: false,
  },
];
