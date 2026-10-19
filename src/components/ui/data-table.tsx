import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

export type DataTableMode = "client" | "server";
export type DataTableSortDirection = "asc" | "desc";
/**
 * Mobile card role:
 * - primary: card title (default: first column with a header)
 * - badge: shown top right next to the title (status chips)
 * - full: spans both grid columns (long values, URLs, notes)
 * - hide: not shown on mobile
 * Columns with an empty header render as the card's action footer.
 */
export type DataTableMobileRole = "primary" | "badge" | "full" | "hide";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  searchable?: boolean;
  searchValue?: (row: T) => string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
  render: (row: T) => ReactNode;
  mobile?: DataTableMobileRole;
}
export interface DataTableFilter<T> { label: string; options: { label: string; value: string }[]; getValue: (row: T) => string; }
export interface DataTableProps<T> {
  data: T[]; columns: DataTableColumn<T>[]; filters?: DataTableFilter<T>[]; getRowKey: (row: T) => string;
  mode?: DataTableMode; page?: number; pageSize?: number; total?: number; onPageChange?: (page: number) => void;
  search?: { value: string; onChange: (value: string) => void };
  filterValues?: Record<string, string>; onFilterChange?: (values: Record<string, string>) => void;
  sortBy?: string; sortDirection?: DataTableSortDirection; onSortChange?: (sortBy: string | undefined, direction: DataTableSortDirection | undefined) => void;
  emptyMessage?: string; emptyAction?: { label: string; onClick: () => void }; toolbarContent?: ReactNode; searchPlaceholder?: string; isLoading?: boolean; loadingRows?: number; hidePagination?: boolean; hideToolbar?: boolean;
  /** Secondary fields shown per card before "Show more". Default 3. */
  mobileVisibleFields?: number;
  onRowClick?: (row: T) => void;
}

function MobileCard<T>({ row, columns, limit, onClick }: { row: T; columns: DataTableColumn<T>[]; limit: number; onClick?: (row: T) => void }) {
  const [open, setOpen] = useState(false);
  const visible = columns.filter((c) => c.mobile !== "hide");
  const actions = visible.filter((c) => !c.header);
  const named = visible.filter((c) => c.header);
  const primary = named.find((c) => c.mobile === "primary") ?? named.find((c) => c.mobile !== "badge");
  const badge = named.find((c) => c.mobile === "badge" && c !== primary);
  const rest = named.filter((c) => c !== primary && c !== badge);
  const shown = open ? rest : rest.slice(0, limit);
  const hiddenCount = rest.length - shown.length;

  return (
    <div
      className={`rounded-xl border bg-card p-3 ${onClick ? "cursor-pointer active:bg-muted/40" : ""}`}
      onClick={onClick ? () => onClick(row) : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 break-words text-sm [&_p]:min-w-0 [&_p]:break-words [&_p]:whitespace-normal">{primary?.render(row)}</div>
        {badge && <div className="shrink-0">{badge.render(row)}</div>}
      </div>
      {shown.length > 0 && (
        <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t pt-2.5">
          {shown.map((c) => (
            <div key={c.key} className={`min-w-0 ${c.mobile === "full" ? "col-span-2" : ""}`}>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.header}</dt>
              <dd className="min-w-0 break-words text-sm [&_p]:min-w-0 [&_p]:break-words [&_span]:max-w-full [&_span]:break-words">{c.render(row)}</dd>
            </div>
          ))}
        </dl>
      )}
      {(rest.length > limit) && (
        <button
          type="button"
          className="mt-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        >
          {open ? "Show less" : `Show ${hiddenCount} more`}
        </button>
      )}
      {actions.length > 0 && (
        <div className="mt-2 flex justify-end gap-2 border-t pt-2" onClick={(e) => e.stopPropagation()}>
          {actions.map((c) => <div key={c.key}>{c.render(row)}</div>)}
        </div>
      )}
    </div>
  );
}

export function DataTable<T>({
  data, columns, filters = [], getRowKey, mode = "client", pageSize = 10, page: controlledPage, total, onPageChange,
  search: controlledSearch, filterValues: controlledFilterValues, onFilterChange,
  sortBy: controlledSortBy, sortDirection: controlledSortDirection, onSortChange,
  emptyMessage = "No records found.", emptyAction, toolbarContent, searchPlaceholder = "Search…",
  isLoading = false, loadingRows = 5, hidePagination = false, hideToolbar = false,
  mobileVisibleFields = 3, onRowClick,
}: DataTableProps<T>) {
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
      const matchesQuery =
        !queryValue.trim() ||
        columns.filter((c) => c.searchable).some((c) => (c.searchValue?.(row) ?? String(c.render(row))).toLowerCase().includes(queryValue.toLowerCase()));
      const matchesFilters = filters.every((f) => !activeFilters[f.label] || f.getValue(row) === activeFilters[f.label]);
      return matchesQuery && matchesFilters;
    });
    if (!activeSortBy) return result;
    const column = columns.find((c) => c.key === activeSortBy);
    if (!column) return result;
    return [...result].sort((l, r) => {
      const a = column.sortValue?.(l) ?? column.searchValue?.(l) ?? "";
      const b = column.sortValue?.(r) ?? column.searchValue?.(r) ?? "";
      const cmp = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
      return activeSortDirection === "desc" ? -cmp : cmp;
    });
  }, [activeFilters, activeSortBy, activeSortDirection, columns, data, filters, queryValue, server]);

  const resultCount = server ? (total ?? data.length) : filtered.length;
  const showToolbar = data.length > 0 || Boolean(controlledSearch?.value);
  const pageCount = Math.max(1, Math.ceil(resultCount / pageSize));
  const currentPageSafe = Math.min(currentPage, pageCount - 1);
  const rows = server ? data : filtered.slice(currentPageSafe * pageSize, (currentPageSafe + 1) * pageSize);
  const changePage = (next: number) => (onPageChange ?? setPage)(next);
  const changeSort = (key: string) => {
    const direction: DataTableSortDirection | undefined = activeSortBy !== key ? "asc" : activeSortDirection === "asc" ? "desc" : undefined;
    onSortChange?.(direction ? key : undefined, direction);
    if (!onSortChange) setLocalSort(direction ? { by: key, direction } : {});
  };

  return (
    <div className="space-y-3">
      {!hideToolbar && showToolbar && (
        // Mobile: search on its own row, filters side by side below. Desktop: single row.
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {(!server || controlledSearch) && (
            <Input
              value={queryValue}
              onChange={(e) => {
                controlledSearch?.onChange(e.target.value);
                if (!controlledSearch) setQuery(e.target.value);
                if (!server) setPage(0);
              }}
              placeholder={searchPlaceholder}
              className="h-9 w-full text-sm shadow-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-72 sm:flex-1"
            />
          )}
          {data.length > 0 && (filters.length > 0 || toolbarContent) && (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              {filters.map((filter) => (
                <select
                  key={filter.label}
                  value={activeFilters[filter.label] ?? ""}
                  disabled={filter.options.length === 0}
                  aria-label={filter.label}
                  onChange={(e) => {
                    const next = { ...activeFilters, [filter.label]: e.target.value };
                    onFilterChange?.(next);
                    if (!controlledFilterValues) setFilterValues(next);
                    if (!server) setPage(0);
                  }}
                  className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <option value="">{filter.options.length ? filter.label : `No ${filter.label.toLowerCase()} available`}</option>
                  {filter.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ))}
              {toolbarContent}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <>
          <div className="hidden overflow-x-auto md:block rounded-lg border">
            <Table className="min-w-max text-xs">
              <TableHeader><TableRow className="border-border/60">{columns.map((c) => <TableHead key={c.key} className="px-2 py-1.5 text-xs font-medium text-muted-foreground/80">{c.header}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {Array.from({ length: loadingRows }, (_, i) => (
                  <TableRow key={`loading-${i}`}>{columns.map((c) => <TableCell key={c.key} className="align-top px-2 py-1.5"><Skeleton className="h-4 w-full max-w-40" /></TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-2 md:hidden">
            {Array.from({ length: Math.min(loadingRows, 3) }, (_, i) => (
              <div key={`m-loading-${i}`} className="space-y-3 rounded-xl border bg-card p-3">
                <Skeleton className="h-4 w-2/3" />
                <div className="grid grid-cols-2 gap-3 border-t pt-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
              </div>
            ))}
          </div>
        </>
      ) : rows.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          {emptyAction && <Button onClick={emptyAction.onClick}><Plus className="mr-2 h-4 w-4" />{emptyAction.label}</Button>}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block rounded-lg border">
            <Table className="min-w-max text-xs">
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  {columns.map((c) => (
                    <TableHead key={c.key} className="whitespace-nowrap px-2 py-1.5 text-xs font-medium text-muted-foreground/80">
                      {c.sortable ? (
                        <button type="button" className="inline-flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => changeSort(c.key)}>
                          {c.header}{activeSortBy === c.key && (activeSortDirection === "asc" ? " ↑" : " ↓")}
                        </button>
                      ) : c.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={getRowKey(row)} className={onRowClick ? "cursor-pointer transition-colors hover:bg-muted/30" : undefined} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                    {columns.map((c) => (
                      <TableCell key={c.key} className="align-top px-2 py-1.5 [&_p]:min-w-0 [&_p]:break-words [&_p]:whitespace-normal">{c.render(row)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 md:hidden">
            {rows.map((row) => (
              <MobileCard key={getRowKey(row)} row={row} columns={columns} limit={mobileVisibleFields} onClick={onRowClick} />
            ))}
          </div>
        </>
      )}

      {!hidePagination && data.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t pb-1 pt-3 text-xs text-muted-foreground">
          <span>{isLoading ? "Loading records…" : `${resultCount} result${resultCount === 1 ? "" : "s"}`}</span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={isLoading || currentPageSafe === 0} onClick={() => changePage(currentPageSafe - 1)}>Previous</Button>
            <span className="px-1.5">{isLoading ? "..." : `${currentPageSafe + 1} / ${pageCount}`}</span>
            <Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={isLoading || currentPageSafe >= pageCount - 1} onClick={() => changePage(currentPageSafe + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}