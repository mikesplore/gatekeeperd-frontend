import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export type DataTableMode = "client" | "server";
export type DataTableSortDirection = "asc" | "desc";
export interface DataTableColumn<T> { key: string; header: string; searchable?: boolean; searchValue?: (row: T) => string; sortable?: boolean; sortValue?: (row: T) => string | number | null | undefined; render: (row: T) => ReactNode; }
export interface DataTableFilter<T> { label: string; options: { label: string; value: string }[]; getValue: (row: T) => string; }
export interface DataTableProps<T> {
  data: T[]; columns: DataTableColumn<T>[]; filters?: DataTableFilter<T>[]; getRowKey: (row: T) => string;
  mode?: DataTableMode; page?: number; pageSize?: number; total?: number; onPageChange?: (page: number) => void;
  search?: { value: string; onChange: (value: string) => void };
  filterValues?: Record<string, string>; onFilterChange?: (values: Record<string, string>) => void;
  sortBy?: string; sortDirection?: DataTableSortDirection; onSortChange?: (sortBy: string | undefined, direction: DataTableSortDirection | undefined) => void;
  emptyMessage?: string; searchPlaceholder?: string; isLoading?: boolean; loadingRows?: number; hidePagination?: boolean; hideToolbar?: boolean;
}

export function DataTable<T>({ data, columns, filters = [], getRowKey, mode = "client", pageSize = 10, page: controlledPage, total, onPageChange, search: controlledSearch, filterValues: controlledFilterValues, onFilterChange, sortBy: controlledSortBy, sortDirection: controlledSortDirection, onSortChange, emptyMessage = "No records found.", searchPlaceholder = "Search…", isLoading = false, loadingRows = 5, hidePagination = false, hideToolbar = false }: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [localSort, setLocalSort] = useState<{ by?: string; direction?: DataTableSortDirection }>({});
  const server = mode === "server";
  const queryValue = controlledSearch?.value ?? query;
  const activeFilters = controlledFilterValues ?? filterValues;
  const currentPage = controlledPage ?? page;
  const activeSortBy = controlledSortBy ?? localSort.by;
  const activeSortDirection = controlledSortDirection ?? localSort.direction;
  const filtered = useMemo(() => {
    if (server) return data;
    const result = data.filter((row) => {
      const matchesQuery = !queryValue.trim() || columns.filter((column) => column.searchable).some((column) => (column.searchValue?.(row) ?? String(column.render(row))).toLowerCase().includes(queryValue.toLowerCase()));
      const matchesFilters = filters.every((filter) => !activeFilters[filter.label] || filter.getValue(row) === activeFilters[filter.label]);
      return matchesQuery && matchesFilters;
    });
    if (!activeSortBy) return result;
    const column = columns.find((candidate) => candidate.key === activeSortBy);
    if (!column) return result;
    return [...result].sort((left, right) => { const a = column.sortValue?.(left) ?? column.searchValue?.(left) ?? ""; const b = column.sortValue?.(right) ?? column.searchValue?.(right) ?? ""; const comparison = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b)); return activeSortDirection === "desc" ? -comparison : comparison; });
  }, [activeFilters, activeSortBy, activeSortDirection, columns, data, filters, queryValue, server]);
  const resultCount = server ? (total ?? data.length) : filtered.length;
  const pageCount = Math.max(1, Math.ceil(resultCount / pageSize));
  const currentPageSafe = Math.min(currentPage, pageCount - 1);
  const rows = server ? data : filtered.slice(currentPageSafe * pageSize, (currentPageSafe + 1) * pageSize);
  const changePage = (next: number) => (onPageChange ?? setPage)(next);
  const changeSort = (key: string) => { const direction: DataTableSortDirection | undefined = activeSortBy !== key ? "asc" : activeSortDirection === "asc" ? "desc" : undefined; const next: { by?: string; direction?: DataTableSortDirection } = direction ? { by: key, direction } : {}; onSortChange?.(direction ? key : undefined, direction); if (!onSortChange) setLocalSort(next); };
  return <div className="space-y-3">
    {!hideToolbar && <div className="rounded-md border bg-muted/10 p-3"><div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">{(!server || controlledSearch) && <Input value={queryValue} onChange={(event) => { controlledSearch?.onChange(event.target.value); if (!controlledSearch) setQuery(event.target.value); if (!server) setPage(0); }} placeholder={searchPlaceholder} className="h-9 text-sm sm:min-w-72 sm:flex-1" />}{filters.map((filter) => <select key={filter.label} value={activeFilters[filter.label] ?? ""} disabled={filter.options.length === 0} aria-label={filter.label} onChange={(event) => { const next = { ...activeFilters, [filter.label]: event.target.value }; onFilterChange?.(next); if (!controlledFilterValues) setFilterValues(next); if (!server) setPage(0); }} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"><option value="">{filter.options.length ? filter.label : `No ${filter.label.toLowerCase()} available`}</option>{filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>)}</div></div>}
    {isLoading ? <Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key}>{column.header}</TableHead>)}</TableRow></TableHeader><TableBody>{Array.from({ length: loadingRows }, (_, row) => <TableRow key={`loading-${row}`}>{columns.map((column) => <TableCell key={column.key}><Skeleton className="h-4 w-full max-w-40" /></TableCell>)}</TableRow>)}</TableBody></Table> : rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p> : <><div className="hidden md:block"><Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key}>{column.sortable ? <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => changeSort(column.key)}>{column.header}{activeSortBy === column.key && (activeSortDirection === "asc" ? " ↑" : " ↓")}</button> : column.header}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={getRowKey(row)}>{columns.map((column) => <TableCell key={column.key}>{column.render(row)}</TableCell>)}</TableRow>)}</TableBody></Table></div><div className="space-y-2 md:hidden">{rows.map((row) => <div key={getRowKey(row)} className="rounded-lg border bg-card p-3"><dl className="grid min-w-0 gap-2">{columns.filter((column) => column.header).map((column) => <div key={column.key} className="grid min-w-0 grid-cols-[7rem_minmax(0,1fr)] gap-2 text-sm"><dt className="text-muted-foreground">{column.header}</dt><dd className="min-w-0 break-words">{column.render(row)}</dd></div>)}</dl></div>)}</div></>}
    {!hidePagination && <div className="flex items-center justify-between border-t pt-4 pb-1 text-xs text-muted-foreground"><span>{isLoading ? "Loading records…" : `${resultCount} result${resultCount === 1 ? "" : "s"}`}</span><div className="flex gap-1.5"><Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={isLoading || currentPageSafe === 0} onClick={() => changePage(currentPageSafe - 1)}>Previous</Button><span className="px-1.5 py-1.5">{isLoading ? "..." : `${currentPageSafe + 1} / ${pageCount}`}</span><Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={isLoading || currentPageSafe >= pageCount - 1} onClick={() => changePage(currentPageSafe + 1)}>Next</Button></div></div>}
  </div>;
}
