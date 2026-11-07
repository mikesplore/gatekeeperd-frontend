import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowRight, Box, BriefcaseBusiness, Globe2, Search, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type SearchItem = { category: string; kind: string; title: string; subtitle: string; href: string };
type SearchResponse = { query: string; results: SearchItem[] };

const categoryOrder = ["Customers", "Projects", "Services", "Domains"];
const ResultIcon = ({ kind }: { kind: string }) => {
  const Icon = kind === "customer" ? UserRound : kind === "project" ? Box : kind === "service" ? BriefcaseBusiness : Globe2;
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></span>;
};

export function GlobalSearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [settledQuery, setSettledQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => setSettledQuery(query.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  const search = useQuery({
    queryKey: ["global-search", settledQuery],
    queryFn: async () => (await api.get<SearchResponse>("/admin/search", { params: { q: settledQuery } })).data,
    enabled: open && settledQuery.length >= 2,
    staleTime: 15_000,
  });
  const items = search.data?.results ?? [];
  const orderedItems = useMemo(() => categoryOrder.flatMap(category => items.filter(item => item.category === category)), [items]);
  useEffect(() => setActiveIndex(0), [settledQuery, items.length]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setSettledQuery("");
    setActiveIndex(0);
  };
  const openResult = (item: SearchItem) => {
    close();
    navigate(item.href);
  };
  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(index => Math.min(index + 1, orderedItems.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && orderedItems[activeIndex]) {
      event.preventDefault();
      openResult(orderedItems[activeIndex]);
    }
  };

  return <>
    <Button type="button" variant="outline" onClick={() => setOpen(true)} className="h-9 w-40 justify-between gap-2 px-2.5 text-muted-foreground sm:w-56">
      <span className="flex min-w-0 items-center gap-2"><Search className="h-4 w-4 shrink-0" /><span className="truncate">Search anything…</span></span>
      <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">Ctrl K</kbd>
    </Button>
    <Dialog open={open} onOpenChange={value => value ? setOpen(true) : close()}>
      <DialogContent className="top-[12vh] max-h-[76vh] max-w-2xl translate-y-0 gap-0 overflow-hidden rounded-xl p-0 shadow-2xl">
        <DialogTitle className="sr-only">Search Gatekeeperd</DialogTitle>
        <DialogDescription className="sr-only">Search customers, projects, services, and domains.</DialogDescription>
        <div className="flex items-center gap-3 border-b py-3 pl-4 pr-12">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <Input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onInputKeyDown} placeholder="Search customers, projects, services, domains…" className="h-10 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0" aria-label="Search Gatekeeperd" />
        </div>
        <div className="max-h-[calc(76vh-7rem)] overflow-y-auto p-2">
          {query.trim().length < 2 ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">Search by customer, project, service, or domain.</div>
            : search.isFetching ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">Searching Gatekeeperd…</div>
              : search.isError ? <div className="px-4 py-8 text-center text-sm text-destructive">Search is unavailable. Try again in a moment.</div>
                : orderedItems.length === 0 ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">No results for “{settledQuery}”.</div>
                  : <div className="space-y-3">
                    {categoryOrder.map(category => {
                      const categoryItems = items.filter(item => item.category === category);
                      if (!categoryItems.length) return null;
                      return <section key={category} aria-label={category}>
                        <h2 className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{category}</h2>
                        <div className="space-y-0.5">{categoryItems.map(item => {
                          const index = orderedItems.indexOf(item);
                          return <button key={`${item.kind}:${item.href}:${item.title}:${item.subtitle}`} type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => openResult(item)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", activeIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-muted/70")}>
                            <ResultIcon kind={item.kind} />
                            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span></span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>;
                        })}</div>
                      </section>;
                    })}
                  </div>}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> to navigate</span><span>↵ to open</span><span>Esc to close</span><span className="ml-auto">Search across Gatekeeperd</span></div>
      </DialogContent>
    </Dialog>
  </>;
}
