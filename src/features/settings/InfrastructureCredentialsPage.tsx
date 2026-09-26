import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, ExternalLink, Github, History, KeyRound, RefreshCw, RotateCw } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components/common/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelFooter, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { useGitHubInstallUrl, useGitHubStatus, useUnlinkGitHub } from "@/hooks/useDeployments";
import type { ProviderCredentialMetadata } from "@/types/project";
import { toast } from "sonner";

type CredentialTab = "registry" | "github-credentials" | "github-connection" | "history";
type CredentialPanel = "registry" | "github-webhook" | "github-key" | null;

export function InfrastructureCredentialsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CredentialTab>("registry");
  const [panel, setPanel] = useState<CredentialPanel>(null);
  const [registry, setRegistry] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [githubWebhookSecret, setGithubWebhookSecret] = useState("");
  const [githubPrivateKey, setGithubPrivateKey] = useState("");
  const [savingGithub, setSavingGithub] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const credentials = useQuery({
    queryKey: ["provider-credentials-metadata"],
    queryFn: async () => (await api.get<ProviderCredentialMetadata[]>("/admin/project-setup/provider-credentials")).data,
  });
  const history = useMemo(() => [...(credentials.data ?? [])].sort((a, b) => a.provider.localeCompare(b.provider) || a.scope.localeCompare(b.scope) || b.version - a.version), [credentials.data]);
  const providers = useMemo(() => [...new Set(history.map(item => item.provider))].sort(), [history]);
  const columns = useMemo<DataTableColumn<ProviderCredentialMetadata>[]>(() => [
    { key: "credential", header: "Credential", searchable: true, searchValue: item => `${item.displayName ?? ""} ${item.scope} ${item.provider} ${item.type}`, sortable: true, sortValue: item => item.displayName || item.scope, render: item => <div className="min-w-0"><p className="font-medium">{item.displayName || item.scope}</p><p className="break-words text-xs text-muted-foreground">{item.type} · {item.scope}</p></div> },
    { key: "provider", header: "Provider", searchable: true, searchValue: item => item.provider, sortable: true, sortValue: item => item.provider, render: item => <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">{item.provider}</span> },
    { key: "version", header: "Version", sortable: true, sortValue: item => item.version, render: item => <span className="text-sm">v{item.version}</span> },
    { key: "created", header: "Created", searchable: true, searchValue: item => new Date(item.createdAt).toLocaleString(), sortable: true, sortValue: item => new Date(item.createdAt).getTime(), render: item => <div className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}{item.rotatedAt && <div>Rotated {new Date(item.rotatedAt).toLocaleString()}</div>}</div> },
    { key: "status", header: "Status", searchable: true, searchValue: item => item.current ? "current" : "superseded", render: item => <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.current ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}><span className={`h-1.5 w-1.5 rounded-full ${item.current ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />{item.current ? "Current" : "Superseded"}</span> },
  ], []);
  const filters = useMemo<DataTableFilter<ProviderCredentialMetadata>[]>(() => [{ label: "Provider", options: providers.map(provider => ({ label: provider, value: provider })), getValue: item => item.provider }], [providers]);
  const github = useGitHubStatus();
  const install = useGitHubInstallUrl();
  const unlink = useUnlinkGitHub();

  const rotateRegistry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/registries/${encodeURIComponent(registry.trim().toLowerCase())}`, { username, password });
      setUsername("");
      setPassword("");
      await queryClient.invalidateQueries({ queryKey: ["provider-credentials-metadata"] });
      toast.success("Registry credential rotated");
      setRegistry("");
      setUsername("");
      setPassword("");
      setPanel(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const rotateGithub = async (event: FormEvent<HTMLFormElement>, type: "webhook_secret" | "app_private_key", value: string) => {
    event.preventDefault();
    setSavingGithub(true);
    try {
      await api.put(`/admin/github/credentials/${type}`, { value });
      if (type === "webhook_secret") setGithubWebhookSecret(""); else setGithubPrivateKey("");
      await queryClient.invalidateQueries({ queryKey: ["provider-credentials-metadata"] });
      toast.success("GitHub credential rotated");
      setPanel(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSavingGithub(false);
    }
  };

  return <div className="w-full space-y-6">
    <Tabs value={tab} onValueChange={value => setTab(value as CredentialTab)} className="space-y-4">
      <div className="-mx-1 overflow-x-auto px-1">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="registry" className="flex-1 sm:flex-none"><Boxes className="mr-2 h-4 w-4" />Registry</TabsTrigger>
          <TabsTrigger value="github-credentials" className="flex-1 sm:flex-none"><KeyRound className="mr-2 h-4 w-4" />GitHub credentials</TabsTrigger>
          <TabsTrigger value="github-connection" className="flex-1 sm:flex-none"><Github className="mr-2 h-4 w-4" />GitHub connection</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none"><History className="mr-2 h-4 w-4" />Version history</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="registry">
        <Card>
          <CardHeader className="border-b pb-4"><CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5 text-primary" />Container registry</CardTitle><CardDescription>Set or rotate credentials for a private image registry. Saving creates a new encrypted version.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm text-muted-foreground">Add or rotate the login Gatekeeperd uses when pulling private images. Previous versions remain available in the history tab.</p>
            <Button className="shrink-0" onClick={() => setPanel("registry")}><RotateCw className="h-4 w-4" />Configure registry</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="github-credentials">
        <Card>
          <CardHeader className="border-b pb-4"><CardTitle className="flex items-center gap-2"><Github className="h-5 w-5" />GitHub credentials</CardTitle><CardDescription>Rotate webhook verification and GitHub App credentials used by integrations and deployments.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 pt-5 md:grid-cols-2">
            <section className="flex flex-col justify-between gap-4 rounded-lg border p-4"><div><h3 className="text-sm font-medium">Webhook secret</h3><p className="mt-1 text-sm text-muted-foreground">Verifies incoming GitHub webhook requests.</p></div><Button variant="outline" className="self-start" onClick={() => setPanel("github-webhook")}><RotateCw className="h-4 w-4" />Set or rotate secret</Button></section>
            <section className="flex flex-col justify-between gap-4 rounded-lg border p-4"><div><h3 className="text-sm font-medium">GitHub App private key</h3><p className="mt-1 text-sm text-muted-foreground">Authenticates GitHub App operations and deployment access.</p></div><Button variant="outline" className="self-start" onClick={() => setPanel("github-key")}><RotateCw className="h-4 w-4" />Set or rotate private key</Button></section>
            <p className="text-xs text-muted-foreground md:col-span-2">Secret values are write-only. After saving, they are cleared and cannot be retrieved later.</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="github-connection">
        <Card>
          <CardHeader className="border-b pb-4"><CardTitle className="flex items-center gap-2"><Github className="h-5 w-5" />GitHub connection</CardTitle><CardDescription>Connect the GitHub App installation used for private repository deployments and webhook events.</CardDescription></CardHeader>
          <CardContent className="space-y-4 pt-5">
            {github.isLoading ? <p className="text-sm text-muted-foreground">Checking GitHub connection…</p> : github.data?.connected ? <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"><div className="space-y-1"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /><p className="font-medium">Connected</p></div><p className="text-sm text-muted-foreground">{github.data.accountLogin ?? "Installation configured"}{github.data.accountType ? ` · ${github.data.accountType}` : ""}</p>{github.data.appSlug && <p className="text-xs text-muted-foreground">GitHub App: {github.data.appSlug}</p>}</div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void github.refetch()} disabled={github.isFetching}><RefreshCw className={`h-4 w-4 ${github.isFetching ? "animate-spin" : ""}`} />Refresh</Button><Button variant="destructive" size="sm" onClick={() => setUnlinkOpen(true)} disabled={unlink.isPending}>Unlink</Button></div></div> : <div className="rounded-lg border border-dashed p-5"><p className="font-medium">GitHub is not connected</p><p className="mt-1 text-sm text-muted-foreground">Install the GitHub App to grant repository access for deployments.</p><Button className="mt-4" onClick={async () => { try { window.location.assign((await install.mutateAsync()).url); } catch (error) { toast.error(getApiErrorMessage(error)); } }} disabled={install.isPending}><ExternalLink className="h-4 w-4" />{install.isPending ? "Preparing…" : "Connect GitHub"}</Button></div>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader className="border-b pb-4"><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />Credential version history</CardTitle><CardDescription>Metadata only. This table never requests or displays secret values.</CardDescription></CardHeader>
          <CardContent className="pt-4"><DataTable data={history} columns={columns} filters={filters} getRowKey={item => item.id} isLoading={credentials.isLoading} emptyMessage={credentials.isError ? getApiErrorMessage(credentials.error) : "No credential versions recorded yet."} searchPlaceholder="Search credentials…" /></CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <SidePanel open={panel !== null} onOpenChange={open => { if (!open) setPanel(null); }}>
      <SidePanelContent>
        <SidePanelHeader className="border-b p-6 text-left">
          <SidePanelTitle>{panel === "registry" ? "Registry credentials" : panel === "github-webhook" ? "GitHub webhook secret" : "GitHub App private key"}</SidePanelTitle>
          <SidePanelDescription>{panel === "registry" ? "Enter the registry scope and credentials Gatekeeperd should use for private image pulls." : "Save a new encrypted credential version. The value is cleared after saving and cannot be retrieved later."}</SidePanelDescription>
        </SidePanelHeader>
        {panel === "registry" ? <form className="flex min-h-0 flex-col" onSubmit={event => void rotateRegistry(event)}>
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div className="space-y-1.5"><Label htmlFor="registry-scope">Registry host or scope</Label><Input id="registry-scope" autoFocus placeholder="docker.io or registry.example.com" value={registry} onChange={event => setRegistry(event.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="registry-username">Username</Label><Input id="registry-username" autoComplete="off" value={username} onChange={event => setUsername(event.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="registry-password">Password or access token</Label><Input id="registry-password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required /></div>
          </div>
          <SidePanelFooter className="border-t p-6 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setPanel(null)}>Cancel</Button><Button type="submit" disabled={saving || !registry.trim() || !username.trim() || !password}>{saving ? "Saving…" : "Save registry credential"}</Button></SidePanelFooter>
        </form> : panel === "github-webhook" ? <form className="flex min-h-0 flex-col" onSubmit={event => void rotateGithub(event, "webhook_secret", githubWebhookSecret)}>
          <div className="flex-1 space-y-4 overflow-y-auto p-6"><div className="space-y-1.5"><Label htmlFor="github-webhook-secret">New webhook secret</Label><Input id="github-webhook-secret" type="password" autoComplete="new-password" autoFocus placeholder="Enter a new webhook secret" value={githubWebhookSecret} onChange={event => setGithubWebhookSecret(event.target.value)} required /></div><p className="text-xs text-muted-foreground">GitHub uses this value to sign webhook requests.</p></div>
          <SidePanelFooter className="border-t p-6 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setPanel(null)}>Cancel</Button><Button type="submit" disabled={savingGithub || !githubWebhookSecret}>{savingGithub ? "Saving…" : "Save webhook secret"}</Button></SidePanelFooter>
        </form> : panel === "github-key" ? <form className="flex min-h-0 flex-col" onSubmit={event => void rotateGithub(event, "app_private_key", githubPrivateKey)}>
          <div className="flex-1 space-y-4 overflow-y-auto p-6"><div className="space-y-1.5"><Label htmlFor="github-private-key">GitHub App private key</Label><textarea id="github-private-key" autoFocus className="min-h-56 w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" value={githubPrivateKey} onChange={event => setGithubPrivateKey(event.target.value)} placeholder="Paste PEM private key" required /></div><p className="text-xs text-muted-foreground">Paste the complete PEM key, including its BEGIN and END lines.</p></div>
          <SidePanelFooter className="border-t p-6 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setPanel(null)}>Cancel</Button><Button type="submit" disabled={savingGithub || !githubPrivateKey}>{savingGithub ? "Saving…" : "Save private key"}</Button></SidePanelFooter>
        </form> : null}
      </SidePanelContent>
    </SidePanel>

    <AlertDialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Unlink GitHub?</AlertDialogTitle><AlertDialogDescription>This removes Gatekeeperd’s stored GitHub installation association. You can reconnect the app later.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async event => { event.preventDefault(); try { await unlink.mutateAsync(); toast.success("GitHub installation unlinked"); } catch (error) { toast.error(getApiErrorMessage(error)); } finally { setUnlinkOpen(false); } }}>Unlink GitHub</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}
