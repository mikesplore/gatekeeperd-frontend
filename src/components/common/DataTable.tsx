import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export interface DataTableColumn<T> { key: string; header: string; searchable?: boolean; searchValue?: (row: T) => string; render: (row: T) => ReactNode; }
export interface DataTableFilter<T> { label: string; options: { label: string; value: string }[]; getValue: (row: T) => string; }

export function DataTable<T>({ data, columns, filters = [], getRowKey, emptyMessage = "No records found.", pageSize = 10, searchPlaceholder = "Search…", isLoading = false, loadingRows = 5, hidePagination = false, hideToolbar = false }: { data: T[]; columns: DataTableColumn<T>[]; filters?: DataTableFilter<T>[]; getRowKey: (row: T) => string; emptyMessage?: string; pageSize?: number; searchPlaceholder?: string; isLoading?: boolean; loadingRows?: number; hidePagination?: boolean; hideToolbar?: boolean }) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => data.filter((row) => {
    const matchesQuery = !query.trim() || columns.filter((column) => column.searchable).some((column) => (column.searchValue?.(row) ?? String(column.render(row))).toLowerCase().includes(query.toLowerCase()));
    const matchesFilters = filters.every((filter) => !filterValues[filter.label] || filter.getValue(row) === filterValues[filter.label]);
    return matchesQuery && matchesFilters;
  }), [columns, data, filterValues, filters, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  return <div className="space-y-3">
    {!hideToolbar && !searchPlaceholder.startsWith("Search actor") && <div className="rounded-md border bg-muted/10 p-3"><div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap"><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder={searchPlaceholder} className="h-9 text-sm sm:min-w-72 sm:flex-1" />{filters.map((filter) => <select key={filter.label} value={filterValues[filter.label] ?? ""} onChange={(event) => { setFilterValues((values) => ({ ...values, [filter.label]: event.target.value })); setPage(0); }} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"><option value="">{filter.label}</option>{filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>)}</div></div>}
    {isLoading ? <Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key}>{column.header}</TableHead>)}</TableRow></TableHeader><TableBody>{Array.from({ length: loadingRows }, (_, row) => <TableRow key={`loading-${row}`}>{columns.map((column) => <TableCell key={column.key}><Skeleton className="h-4 w-full max-w-40" /></TableCell>)}</TableRow>)}</TableBody></Table> : rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p> : <Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key}>{column.header}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={getRowKey(row)}>{columns.map((column) => <TableCell key={column.key}>{column.render(row)}</TableCell>)}</TableRow>)}</TableBody></Table>}
    {!hidePagination && !searchPlaceholder.startsWith("Search actor, action") && <div className="flex items-center justify-between border-t pt-4 pb-1 text-xs text-muted-foreground"><span>{isLoading ? "Loading records…" : `${filtered.length} result${filtered.length === 1 ? "" : "s"}`}</span><div className="flex gap-1.5"><Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={isLoading || currentPage === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="px-1.5 py-1.5">{isLoading ? "..." : `${currentPage + 1} / ${pageCount}`}</span><Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={isLoading || currentPage >= pageCount - 1} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>}
  </div>;
}
