import { useState } from "react";
import { AlertTriangle, LockKeyhole, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { useCertificateList, useInstallCertificate, useRemoveCertificate } from "@/hooks/useNginx";
import { getApiErrorMessage } from "@/lib/api";
import type { CertificateInfo } from "@/types/nginx";

export function CertificatesPage() {
  const query = useCertificateList();
  const install = useInstallCertificate();
  const remove = useRemoveCertificate();
  const [panelOpen, setPanelOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<CertificateInfo | null>(null);
  const certificates = query.data?.certificates ?? [];
  const renewalNeeded = certificates.filter(cert => cert.renewalStatus === "expired" || (cert.certificateDaysRemaining != null && cert.certificateDaysRemaining <= 30)).length;

  async function handleInstall(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await install.mutateAsync({ domain: domain.trim(), email: email.trim() });
      toast.success("Certificate installed", { description: `TLS files for ${domain.trim()} are available on this server.` });
      setPanelOpen(false);
      setDomain("");
    } catch (error) {
      toast.error("Certificate installation failed", { description: getApiErrorMessage(error) });
    }
  }

  async function handleRemove() {
    if (!selected) return;
    try {
      await remove.mutateAsync(selected.certificateDomain);
      toast.success("Certificate removed");
      setSelected(null);
    } catch (error) {
      toast.error("Could not remove certificate", { description: getApiErrorMessage(error) });
    }
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><p className="text-sm text-muted-foreground">Check TLS certificates available to Nginx and install certificates for your domains.</p><Button onClick={() => setPanelOpen(true)}><Plus className="mr-2 h-4 w-4" />Install certificate</Button></div>
    <div className="grid gap-4 sm:grid-cols-3">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Available certificates</CardTitle></CardHeader><CardContent className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-primary"/><span className="text-3xl font-semibold">{query.isLoading ? "—" : certificates.length}</span></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Certificate source</CardTitle></CardHeader><CardContent className="text-sm">Let’s Encrypt via Certbot</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Renewal needed soon</CardTitle></CardHeader><CardContent className={`text-3xl font-semibold ${renewalNeeded ? "text-amber-600" : "text-emerald-600"}`}>{query.isLoading ? "—" : renewalNeeded}</CardContent></Card>
    </div>
    <Card><CardHeader className="border-b"><CardTitle>Installed certificates</CardTitle><CardDescription>Only certificates with both certificate and private-key files present are listed. Nginx needs both before an HTTPS site can be enabled.</CardDescription></CardHeader><CardContent className="p-0">
      {query.isLoading ? <p className="p-8 text-sm text-muted-foreground">Checking server certificate files…</p> : query.isError ? <div className="p-8 text-sm text-destructive">{getApiErrorMessage(query.error)}</div> : certificates.length ? <div className="divide-y">{certificates.map(cert => { const days = cert.certificateDaysRemaining; const expired = cert.renewalStatus === "expired"; const health = expired ? "Expired" : days == null ? "Expiry unknown" : days <= 30 ? "Renew soon" : "Valid"; const color = expired ? "border-red-600/30 text-red-700" : days == null ? "border-slate-500/30 text-slate-600" : days <= 30 ? "border-amber-600/30 text-amber-700" : "border-emerald-600/30 text-emerald-700"; return <div key={cert.certificateDomain} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><LockKeyhole className="h-4 w-4 text-primary"/><h3 className="font-semibold">{cert.certificateDomain}</h3><Badge variant="outline" className="border-emerald-600/30 text-emerald-700">Files available</Badge><Badge variant="outline" className={color}>{health}</Badge></div><p className="text-sm">{cert.certificateExpiresAt ? `Expires ${new Date(cert.certificateExpiresAt).toLocaleString()}${days != null ? ` · ${expired ? `${Math.abs(days)} days overdue` : `${days} days remaining`}` : ""}` : "Expiry date could not be read from the certificate."}</p><p className="break-all font-mono text-xs text-muted-foreground">{cert.certificatePath}</p><p className="break-all font-mono text-xs text-muted-foreground">{cert.privateKeyPath}</p></div><Button variant="outline" size="sm" onClick={() => setSelected(cert)}><Trash2 className="mr-2 h-4 w-4"/>Remove</Button></div>; })}</div> : <div className="flex flex-col items-center px-6 py-14 text-center"><div className="mb-4 rounded-full bg-primary/10 p-3 text-primary"><LockKeyhole className="h-6 w-6"/></div><h3 className="font-semibold">No certificates available</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">Install a Let’s Encrypt certificate before enabling HTTPS for a site. Certificate files will be checked on this server.</p><Button className="mt-5" onClick={() => setPanelOpen(true)}><Plus className="mr-2 h-4 w-4"/>Install your first certificate</Button></div>}
    </CardContent></Card>
    {renewalNeeded > 0 && <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600"/><p>Certificates expiring within 30 days or already expired need renewal to avoid HTTPS failures.</p></div>}
    <SidePanel open={panelOpen} onOpenChange={setPanelOpen}><SidePanelContent><SidePanelHeader className="border-b p-6"><SidePanelTitle>Install a TLS certificate</SidePanelTitle><SidePanelDescription>Request a Let’s Encrypt certificate on the Nginx host using Certbot.</SidePanelDescription></SidePanelHeader><form onSubmit={handleInstall} className="space-y-5 p-6"><label className="block space-y-2 text-sm font-medium">Domain<Input required placeholder="app.example.com" value={domain} onChange={e => setDomain(e.target.value)} /></label><label className="block space-y-2 text-sm font-medium">Email for certificate notices<Input required type="email" placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} /></label><p className="text-xs text-muted-foreground">DNS for this domain must point to this server and ports 80/443 must be reachable for validation.</p><div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setPanelOpen(false)}>Cancel</Button><Button type="submit" disabled={install.isPending}>{install.isPending ? "Installing…" : "Request certificate"}</Button></div></form></SidePanelContent></SidePanel>
    <AlertDialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove {selected?.certificateDomain}?</AlertDialogTitle><AlertDialogDescription>This removes the certificate from this server. Removal is blocked while an active site references it.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={remove.isPending} onClick={event => { event.preventDefault(); void handleRemove(); }}>{remove.isPending ? "Removing…" : "Remove certificate"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
