import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QueryState } from "@/components/QueryState";
import { getApiErrorMessage } from "@/lib/api";
import { useDeadConfigs, useDeleteDeadConfig, useDeleteManualConfig, useDisableManualConfig, useManualConfigDetail, type NginxConfigArtifact } from "@/hooks/useSiteDashboard";

type ConfirmAction = { filename: string; action: "orphan" | "disable" | "delete" } | null;

function ConfigRow({ config, onRemove, onReview }: { config: NginxConfigArtifact; onRemove?: () => void; onReview?: () => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"><div className="min-w-0"><p className="font-mono text-sm">{config.filename}</p><p className="text-sm text-muted-foreground">{config.domains.length ? config.domains.join(", ") : "No server_name found"}</p><p className="text-xs text-muted-foreground">Listen ports: {config.listenPorts?.length ? config.listenPorts.join(", ") : "unknown"}</p></div><div className="flex flex-wrap items-center gap-2"><Badge variant={config.available ? "secondary" : "outline"}>{config.available ? "available" : "not available"}</Badge><Badge variant={config.enabled ? "default" : "outline"}>{config.enabled ? "enabled" : "disabled"}</Badge>{onReview && <Button size="sm" variant="outline" onClick={onReview}>Review config</Button>}{onRemove && <Button variant="destructive" size="sm" onClick={onRemove}>Remove with backup</Button>}</div></div>;
}

function ConfigGroup({ title, description, configs, empty, onRemove, onReview }: { title: string; description: string; configs: NginxConfigArtifact[]; empty: string; onRemove?: (filename: string) => void; onReview?: (config: NginxConfigArtifact) => void }) {
  return <Card><CardHeader><CardTitle>{title} <span className="text-muted-foreground">({configs.length})</span></CardTitle><p className="text-sm text-muted-foreground">{description}</p></CardHeader><CardContent className="space-y-3">{configs.length ? configs.map(config => <ConfigRow key={config.filename} config={config} onRemove={onRemove ? () => onRemove(config.filename) : undefined} onReview={onReview ? () => onReview(config) : undefined} />) : <p className="text-sm text-muted-foreground">{empty}</p>}</CardContent></Card>;
}

export function DeadConfigsPage() {
  const query = useDeadConfigs();
  const remove = useDeleteDeadConfig();
  const disableManual = useDisableManualConfig();
  const deleteManual = useDeleteManualConfig();
  const [reviewFilename, setReviewFilename] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const selectedConfig = useManualConfigDetail(reviewFilename);
  const groups = useMemo(() => {
    const configs = query.data ?? [];
    return {
      linked: configs.filter(config => config.classification === "gatekeeper_managed" && config.tracked && !config.orphaned),
      orphaned: configs.filter(config => config.classification === "gatekeeper_managed" && config.orphaned),
      manual: configs.filter(config => config.classification === "manual"),
    };
  }, [query.data]);
  const confirm = async () => {
    if (!confirmAction) return;
    const { filename, action } = confirmAction;
    try {
      if (action === "orphan") {
        const result = await remove.mutateAsync(filename);
        toast.success(`${filename} removed from nginx`, { description: `Backup: ${result.data?.backup ?? "created"}` });
      } else if (action === "disable") {
        const result = await disableManual.mutateAsync(filename);
        const managed = result.data.resolvedManagedConfigs;
        toast.success(`${filename} disabled`, { description: managed.length ? `Backed up and reloaded. Matching domain now has enabled Gatekeeper config: ${managed.join(", ")}.` : "Backed up, nginx -t passed, and nginx reloaded." });
      } else {
        const result = await deleteManual.mutateAsync(filename);
        toast.success(`${filename} deleted from sites-available`, { description: `Backup: ${result.data.backup}` });
      }
      setConfirmAction(null);
      setReviewFilename(action === "disable" ? filename : null);
    } catch (error) { toast.error(getApiErrorMessage(error)); }
  };
  const busy = remove.isPending || disableManual.isPending || deleteManual.isPending;
  const confirmText = confirmAction?.action === "orphan" ? "Move this orphaned config to backup?" : confirmAction?.action === "disable" ? "Back up and disable this manual config?" : "Back up and delete this disabled config?";

  return <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>{configs => <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Nginx config reconciliation</h1><p className="text-sm text-muted-foreground">{configs.length} discovered config{configs.length === 1 ? "" : "s"}. Gatekeeperd self-domain configs are excluded.</p></div><ConfigGroup title="Gatekeeper managed · linked to a live site" description="These configs are recognized by Gatekeeperd and match a current site." configs={groups.linked} empty="No linked managed configs found." /><ConfigGroup title="Gatekeeper managed · orphaned" description="These marked configs no longer match a current site." configs={groups.orphaned} empty="No orphaned managed configs found." onRemove={filename => setConfirmAction({ filename, action: "orphan" })} /><ConfigGroup title="Unmarked / manual configs" description="Review the parsed domains, ports, and full file before taking action. Enabled configs can be backed up and disabled; deleting from sites-available is a separate step." configs={groups.manual} empty="No unmarked configs found." onReview={config => setReviewFilename(config.filename)} />

    <Dialog open={reviewFilename !== null} onOpenChange={open => !open && setReviewFilename(null)}><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Review manual config: {reviewFilename}</DialogTitle><DialogDescription>Review the parsed server names, listen ports, and complete config content before choosing an action.</DialogDescription></DialogHeader>{selectedConfig.isLoading ? <p className="text-sm text-muted-foreground">Loading config…</p> : selectedConfig.isError ? <p className="text-sm text-destructive">{getApiErrorMessage(selectedConfig.error)}</p> : selectedConfig.data && <div className="space-y-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">Domains: {selectedConfig.data.domains.join(", ") || "none parsed"}</Badge><Badge variant="outline">Ports: {selectedConfig.data.listenPorts.join(", ") || "unknown"}</Badge><Badge variant={selectedConfig.data.enabled ? "default" : "secondary"}>{selectedConfig.data.enabled ? "enabled" : "disabled"}</Badge></div><pre className="max-h-[50vh] overflow-auto rounded-md bg-muted p-4 text-xs">{selectedConfig.data.content}</pre><div className="flex flex-wrap justify-end gap-2">{selectedConfig.data.enabled ? <Button variant="destructive" onClick={() => setConfirmAction({ filename: selectedConfig.data!.filename, action: "disable" })}>Back up and disable</Button> : selectedConfig.data.available ? <Button variant="destructive" onClick={() => setConfirmAction({ filename: selectedConfig.data!.filename, action: "delete" })}>Delete from sites-available</Button> : <p className="text-sm text-muted-foreground">This config has no sites-available file to delete.</p>}</div></div>}</DialogContent></Dialog>

    <AlertDialog open={confirmAction !== null} onOpenChange={open => !open && setConfirmAction(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmText}</AlertDialogTitle><AlertDialogDescription>{confirmAction?.action === "disable" ? `This creates a timestamped backup of ${confirmAction.filename}, unlinks it from sites-enabled, runs nginx -t, then reloads nginx. The config remains in sites-available.` : confirmAction?.action === "delete" ? `This creates another timestamped backup, then deletes ${confirmAction.filename} from sites-available. This is a separate action after disabling.` : "This moves the orphaned managed config to backup and removes its enabled link."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={busy} onClick={event => { event.preventDefault(); void confirm(); }}>{busy ? "Working…" : "Confirm action"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>}</QueryState>;
}
