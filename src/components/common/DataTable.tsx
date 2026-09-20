import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface DataTableColumn<T> { key: string; header: string; searchable?: boolean; searchValue?: (row: T) => string; render: (row: T) => ReactNode; }
export interface DataTableFilter<T> { label: string; options: { label: string; value: string }[]; getValue: (row: T) => string; }

export function DataTable<T>({ data, columns, filters = [], getRowKey, emptyMessage = "No records found.", pageSize = 10 }: { data: T[]; columns: DataTableColumn<T>[]; filters?: DataTableFilter<T>[]; getRowKey: (row: T) => string; emptyMessage?: string; pageSize?: number }) {
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
    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap"><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Search…" className="h-8 text-sm sm:max-w-xs" />{filters.map((filter) => <select key={filter.label} value={filterValues[filter.label] ?? ""} onChange={(event) => { setFilterValues((values) => ({ ...values, [filter.label]: event.target.value })); setPage(0); }} className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"><option value="">{filter.label}</option>{filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>)}</div>
    {rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p> : <Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key}>{column.header}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={getRowKey(row)}>{columns.map((column) => <TableCell key={column.key}>{column.render(row)}</TableCell>)}</TableRow>)}</TableBody></Table>}
    <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{filtered.length} result{filtered.length === 1 ? "" : "s"}</span><div className="flex gap-1.5"><Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={currentPage === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="px-1.5 py-1">{currentPage + 1} / {pageCount}</span><Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={currentPage >= pageCount - 1} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
  </div>;
}
