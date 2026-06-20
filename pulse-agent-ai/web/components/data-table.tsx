import type { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Tailwind classes applied to both the header and the cell (e.g. "text-right"). */
  className?: string;
  /** Render the cell with monospace tabular numerals. */
  mono?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  /** Rows that match get the full-width RED critical highlight. */
  isCritical?: (row: T) => boolean;
  /** Extra Tailwind classes applied to a whole row (e.g. green/yellow status tint). */
  rowClassName?: (row: T) => string | undefined;
  empty?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isCritical,
  rowClassName,
  empty = "No rows to show.",
}: DataTableProps<T>) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const critical = isCritical?.(row) ?? false;
            const tint = rowClassName?.(row);
            return (
              <TableRow
                key={rowKey(row, i)}
                className={cn(
                  critical && "bg-destructive/10 hover:bg-destructive/15",
                  !critical && tint
                )}
              >
                {columns.map((col, ci) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      col.className,
                      col.mono && "font-mono nums",
                      critical && ci === 0 && "border-l-2 border-destructive font-semibold"
                    )}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
