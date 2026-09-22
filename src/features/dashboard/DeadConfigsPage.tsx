import { useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { getApiErrorMessage } from "@/lib/api";
import { useDeadConfigs, useDeleteDeadConfig } from "@/hooks/useSiteDashboard";

export function DeadConfigsPage() {
  const query = useDeadConfigs();
  const remove = useDeleteDeadConfig();
  const [target, setTarget] = useState<string | null>(null);
  const confirmDelete = async () => {
    if (!target) return;
    try { await remove.mutateAsync(target); toast.success(`${target} moved to backup`); setTarget(null); }
    catch (error) { toast.error(getApiErrorMessage(error)); }
  };
  return <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>{configs => <div className="space-y-6"><Card><CardHeader><CardTitle>{configs.length} config{configs.length === 1 ? "" : "s"} require attention</CardTitle></CardHeader><CardContent className="space-y-3">{configs.length ? configs.map(config => <div key={config.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"><div><p className="font-mono text-sm">{config.slug}</p><p className="text-sm text-muted-foreground">Orphaned Nginx configuration</p></div><div className="flex items-center gap-2"><Badge variant="destructive">dead config</Badge><Button variant="destructive" size="sm" onClick={() => setTarget(config.slug)}>Delete with backup</Button></div></div>) : <p className="text-sm text-muted-foreground">No dead configurations found.</p>}</CardContent></Card><AlertDialog open={target !== null} onOpenChange={open => !open && setTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Move {target} to backup?</AlertDialogTitle><AlertDialogDescription>This removes the orphaned file from sites-available and moves it to a timestamped backup. This action requires explicit confirmation.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={remove.isPending} onClick={event => { event.preventDefault(); void confirmDelete(); }}>{remove.isPending ? "Backing up…" : "Delete with backup"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>}</QueryState>;
}
