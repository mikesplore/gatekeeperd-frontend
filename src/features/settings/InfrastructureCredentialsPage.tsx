import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Boxes, CircleAlert, CircleCheck, ExternalLink, FileText, Github, HeartPulse, History, KeyRound, RefreshCw, RotateCw } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components/common/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelFooter, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { useGitHubInstallUrl, useGitHubStatus, useUnlinkGitHub } from "@/hooks/useDeployments";
import type { ProviderCredentialMetadata } from "@/types/project";
import { toast } from "sonner";

type CredentialTab = "registry" | "scribed" | "github-credentials" | "github-connection" | "history";
type CredentialPanel = "registry" | "github-webhook" | "github-key" | null;

export function InfrastructureCredentialsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CredentialTab>("registry");
  const [panel, setPanel] = useState<CredentialPanel>(null);
  const [registry, setRegistry] = useState("");
  const [registryAction, setRegistryAction] = useState<"connect" | "rotate">("connect");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [githubWebhookSecret, setGithubWebhookSecret] = useState("");
  const [githubPrivateKey, setGithubPrivateKey] = useState("");
  const [savingGithub, setSavingGithub] = useState(false);
  const [savingScribed, setSavingScribed] = useState(false);
  const [checkingScribed, setCheckingScribed] = useState(false);
  const [editingScribedProfile, setEditingScribedProfile] = useState(false);
  const [savingScribedProfile, setSavingScribedProfile] = useState(false);
  const [scribedProfileForm, setScribedProfileForm] = useState({ name: "Gatekeeperd", address: "", contactEmail: "", phone: "" });
  const [scribedHealth, setScribedHealth] = useState<{ reachable: boolean; message: string } | null>(null);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const credentials = useQuery({
    queryKey: ["provider-credentials-metadata"],
    queryFn: async () => (await api.get<ProviderCredentialMetadata[]>("/admin/provider-credentials")).data,
  });
  const scribed = useQuery({
    queryKey: ["integrations", "scribed"],
    queryFn: async () => (await api.get<{ baseUrl: string; configured: boolean; tokenConfigured: boolean; clientRegistered: boolean; clientName: string | null; clientAddress: string | null; contactEmail: string | null; phone: string | null; credentialVersion: number | null; environmentTokenAvailable: boolean }>("/admin/integrations/scribed")).data,
  });
  const scribedProfile = useQuery({
    queryKey: ["integrations", "scribed", "profile"],
    enabled: !!scribed.data?.tokenConfigured,
    queryFn: async () => (await api.get<{ id: number; name: string; address: string | null; contact_email: string | null; phone: string | null }>("/admin/integrations/scribed/profile")).data,
  });
  useEffect(() => {
    if (!scribedProfile.data || editingScribedProfile) return;
    setScribedProfileForm({
      name: scribedProfile.data.name,
      address: scribedProfile.data.address ?? "",
      contactEmail: scribedProfile.data.contact_email ?? "",
      phone: scribedProfile.data.phone ?? "",
    });
  }, [scribedProfile.data, editingScribedProfile]);
  const history = useMemo(() => [...(credentials.data ?? [])].sort((a, b) => a.provider.localeCompare(b.provider) || a.scope.localeCompare(b.scope) || b.version - a.version), [credentials.data]);
  const providers = useMemo(() => [...new Set(history.map(item => item.provider))].sort(), [history]);
  const currentDockerHubCredential = credentials.data?.find(item => item.provider === "docker" && item.type === "registry" && item.scope === "docker.io" && item.current);
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

  const registerScribedFromEnvironment = async () => {
    setSavingScribed(true);
    try {
      await api.post("/admin/integrations/scribed/import-env");
      setScribedHealth(null);
      await queryClient.invalidateQueries({ queryKey: ["integrations", "scribed"] });
      await queryClient.invalidateQueries({ queryKey: ["provider-credentials-metadata"] });
      toast.success("Scribed scoped token imported and stored encrypted");
    } catch (error) { toast.error(getApiErrorMessage(error)); }
    finally { setSavingScribed(false); }
  };

  const checkScribed = async () => {
    setCheckingScribed(true);
    try {
      const result = (await api.post<{ reachable: boolean; message: string }>("/admin/integrations/scribed/health")).data;
      setScribedHealth(result);
    } catch (error) {
      setScribedHealth({ reachable: false, message: getApiErrorMessage(error) });
    } finally { setCheckingScribed(false); }
  };

  const saveScribedProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingScribedProfile(true);
    try {
      await api.put("/admin/integrations/scribed/profile", {
        name: scribedProfileForm.name,
        address: scribedProfileForm.address || null,
        contactEmail: scribedProfileForm.contactEmail || null,
        phone: scribedProfileForm.phone || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["integrations", "scribed"] });
      toast.success("Gatekeeperd business profile updated");
      setEditingScribedProfile(false);
    } catch (error) { toast.error(getApiErrorMessage(error)); }
    finally { setSavingScribedProfile(false); }
  };

  const rotateRegistry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/registries/${encodeURIComponent(registry.trim().toLowerCase())}`, { username, password });
      setUsername("");
      setPassword("");
      await queryClient.invalidateQueries({ queryKey: ["provider-credentials-metadata"] });
      toast.success(registryAction === "rotate" ? "Docker Hub token rotated" : "Docker Hub connected");
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

  const scribedStatusLabel = scribedHealth
    ? scribedHealth.reachable ? "Connected" : "Unavailable"
    : scribed.data?.credentialVersion != null ? "Token saved" : "Not registered";
  const scribedStatusStyle = scribedHealth
    ? scribedHealth.reachable
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : "border-destructive/20 bg-destructive/10 text-destructive"
    : "border-border bg-muted text-muted-foreground";

  return <div className="w-full space-y-6">
    <Tabs value={tab} onValueChange={value => setTab(value as CredentialTab)} className="space-y-4">
      <div className="overflow-x-auto -mx-1 px-1">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="registry" className="flex-1 sm:flex-none"><Boxes className="mr-2 h-4 w-4" />Docker Hub</TabsTrigger>
          <TabsTrigger value="scribed" className="flex-1 sm:flex-none"><FileText className="mr-2 h-4 w-4" />Scribed</TabsTrigger>
          <TabsTrigger value="github-credentials" className="flex-1 sm:flex-none"><KeyRound className="mr-2 h-4 w-4" />GitHub credentials</TabsTrigger>
          <TabsTrigger value="github-connection" className="flex-1 sm:flex-none"><Github className="mr-2 h-4 w-4" />GitHub connection</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none"><History className="mr-2 h-4 w-4" />Version history</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="registry">
        <Card>
          <CardHeader className="border-b pb-4"><CardDescription>Manage Docker Hub access for private image pulls. Provider credentials are separate from service environment variables.</CardDescription></CardHeader>
          <CardContent className="pt-5">
            {credentials.isLoading ? <p className="text-sm text-muted-foreground">Checking Docker Hub connection…</p> : credentials.isError ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-destructive">{getApiErrorMessage(credentials.error)}</p><Button variant="outline" size="sm" loading={credentials.isFetching} loadingText="Checking…" disabled={credentials.isFetching} onClick={() => void credentials.refetch()}>Retry</Button></div> : currentDockerHubCredential ? <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="space-y-1"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /><p className="font-medium">Docker Hub connected</p></div><p className="text-sm text-foreground/80">{currentDockerHubCredential.displayName}</p><p className="text-xs text-muted-foreground">{currentDockerHubCredential.scope} · version {currentDockerHubCredential.version} · added {new Date(currentDockerHubCredential.createdAt).toLocaleString()}</p><p className="text-xs text-muted-foreground">Deployments for this registry use the current central credential. Previous credential versions remain in history.</p></div><Button variant="outline" className="shrink-0" onClick={() => { setRegistry(currentDockerHubCredential.scope); setUsername(currentDockerHubCredential.displayName); setPassword(""); setRegistryAction("rotate"); setPanel("registry"); }}><RotateCw className="h-4 w-4" />Rotate token</Button></div> : <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Docker Hub is not connected</p><p className="mt-1 text-sm text-muted-foreground">Connect a Docker Hub username and access token for private image pulls across deployments.</p></div><Button className="shrink-0" onClick={() => { setRegistry("docker.io"); setUsername(""); setPassword(""); setRegistryAction("connect"); setPanel("registry"); }}><RotateCw className="h-4 w-4" />Connect Docker Hub</Button></div>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="scribed">
        <Card>
          <CardHeader className="border-b pb-4"><CardDescription>Connect Scribed for invoice and receipt documents.</CardDescription></CardHeader>
          <CardContent className="space-y-5 pt-5">
            {scribed.isLoading ? <p className="text-sm text-muted-foreground">Loading Scribed settings…</p> : scribed.isError ? <p className="text-sm text-destructive">{getApiErrorMessage(scribed.error)}</p> : <>
              <div className="max-w-3xl space-y-4">
                <section className="overflow-hidden rounded-xl border bg-card">
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${scribedHealth?.reachable ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : scribedHealth?.reachable === false ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                      {scribedHealth?.reachable ? <CircleCheck className="h-5 w-5" /> : scribedHealth?.reachable === false ? <CircleAlert className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold">Scribed document service</h3>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${scribedStatusStyle}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${scribedHealth ? (scribedHealth.reachable ? "bg-emerald-500" : "bg-destructive") : "bg-muted-foreground"}`} />{scribedStatusLabel}
                        </span>
                      </div>
                      <p className="break-all text-sm text-muted-foreground">{scribed.data?.baseUrl || "Scribed URL is not configured"}</p>
                      {scribed.data?.credentialVersion != null && <p className="text-xs text-muted-foreground">Scoped token saved securely · version {scribed.data.credentialVersion}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3">
                    <p className="text-xs text-muted-foreground">Used to create invoices and receipts.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => void checkScribed()} loading={checkingScribed} disabled={checkingScribed || !scribed.data?.configured}><HeartPulse className="h-4 w-4" />Check connection</Button>
                      <Button type="button" size="sm" onClick={() => void registerScribedFromEnvironment()} loading={savingScribed} disabled={savingScribed || !scribed.data?.environmentTokenAvailable}>{savingScribed ? "Validating…" : scribed.data?.credentialVersion != null ? "Refresh token" : "Register"}</Button>
                    </div>
                  </div>
                  {scribedHealth && <div className={`border-t px-5 py-3 text-sm ${scribedHealth.reachable ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`} role="status">{scribedHealth.message}</div>}
                </section>
                {scribed.data?.tokenConfigured && <section className="rounded-xl border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Building2 className="h-4 w-4" /></div>
                      <div><h3 className="text-sm font-semibold">Business profile</h3><p className="text-sm text-muted-foreground">{scribedProfile.isError ? "Profile unavailable" : scribedProfile.data?.name ?? "Loading profile…"}</p></div>
                    </div>
                    {!editingScribedProfile && !scribedProfile.isError && <Button type="button" variant="outline" size="sm" onClick={() => setEditingScribedProfile(true)}>Edit profile</Button>}
                  </div>
                  {scribedProfile.isError && <p className="mt-4 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">{scribedHealth?.reachable === false ? "Scribed is unreachable, so the profile could not be loaded." : "Scribed did not allow this token to access its client profile."}</p>}
                  {editingScribedProfile && <form className="mt-5 space-y-4 border-t pt-4" onSubmit={event => void saveScribedProfile(event)}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5"><Label htmlFor="scribed-profile-name">Business name</Label><Input id="scribed-profile-name" value={scribedProfileForm.name} onChange={event => setScribedProfileForm(current => ({ ...current, name: event.target.value }))} maxLength={120} required /></div>
                      <div className="space-y-1.5"><Label htmlFor="scribed-profile-email">Contact email</Label><Input id="scribed-profile-email" type="email" value={scribedProfileForm.contactEmail} onChange={event => setScribedProfileForm(current => ({ ...current, contactEmail: event.target.value }))} maxLength={254} /></div>
                      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="scribed-profile-address">Business address</Label><Input id="scribed-profile-address" value={scribedProfileForm.address} onChange={event => setScribedProfileForm(current => ({ ...current, address: event.target.value }))} maxLength={1000} /></div>
                      <div className="space-y-1.5"><Label htmlFor="scribed-profile-phone">Phone</Label><Input id="scribed-profile-phone" type="tel" value={scribedProfileForm.phone} onChange={event => setScribedProfileForm(current => ({ ...current, phone: event.target.value }))} maxLength={40} /></div>
                    </div>
                    <div className="flex gap-2"><Button type="submit" loading={savingScribedProfile} disabled={savingScribedProfile}>Save profile</Button><Button type="button" variant="outline" onClick={() => setEditingScribedProfile(false)} disabled={savingScribedProfile}>Cancel</Button></div>
                  </form>}
                </section>}
              </div>
            </>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="github-credentials">
        <Card>
          <CardHeader className="border-b pb-4"><CardDescription>Rotate webhook verification and GitHub App credentials used by integrations and deployments.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 pt-5 md:grid-cols-2">
            <section className="flex flex-col justify-between gap-4 rounded-lg border p-4"><div><h3 className="text-sm font-medium">Webhook secret</h3><p className="mt-1 text-sm text-muted-foreground">Verifies incoming GitHub webhook requests.</p></div><Button variant="outline" className="self-start" onClick={() => setPanel("github-webhook")}><RotateCw className="h-4 w-4" />Set or rotate secret</Button></section>
            <section className="flex flex-col justify-between gap-4 rounded-lg border p-4"><div><h3 className="text-sm font-medium">GitHub App private key</h3><p className="mt-1 text-sm text-muted-foreground">Authenticates GitHub App operations and deployment access.</p></div><Button variant="outline" className="self-start" onClick={() => setPanel("github-key")}><RotateCw className="h-4 w-4" />Set or rotate private key</Button></section>
            <p className="text-xs text-muted-foreground md:col-span-2">Secret values are write-only. After saving, they are cleared and cannot be retrieved later.</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="github-connection">
        <Card>
          <CardHeader className="border-b pb-4"><CardDescription>Connect the GitHub App installation used for private repository deployments and webhook events.</CardDescription></CardHeader>
          <CardContent className="space-y-4 pt-5">
            {github.isLoading ? <p className="text-sm text-muted-foreground">Checking GitHub connection…</p> : github.data?.connected ? <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"><div className="space-y-1"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /><p className="font-medium">Connected</p></div><p className="text-sm text-muted-foreground">{github.data.accountLogin ?? "Installation configured"}{github.data.accountType ? ` · ${github.data.accountType}` : ""}</p>{github.data.appSlug && <p className="text-xs text-muted-foreground">GitHub App: {github.data.appSlug}</p>}</div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void github.refetch()} loading={github.isFetching} loadingText="Refresh" disabled={github.isFetching}><RefreshCw className="h-4 w-4" />Refresh</Button><Button variant="destructive" size="sm" onClick={() => setUnlinkOpen(true)} loading={unlink.isPending} disabled={unlink.isPending}>Unlink</Button></div></div> : <div className="rounded-lg border border-dashed p-5"><p className="font-medium">GitHub is not connected</p><p className="mt-1 text-sm text-muted-foreground">Install the GitHub App to grant repository access for deployments.</p><Button className="mt-4" onClick={async () => { try { window.location.assign((await install.mutateAsync()).url); } catch (error) { toast.error(getApiErrorMessage(error)); } }} loading={install.isPending} disabled={install.isPending}><ExternalLink className="h-4 w-4" />{install.isPending ? "Preparing…" : "Connect GitHub"}</Button></div>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader className="border-b pb-4"><CardDescription>Metadata only. This table never requests or displays secret values.</CardDescription></CardHeader>
          <CardContent className="pt-4"><DataTable data={history} columns={columns} filters={filters} getRowKey={item => item.id} isLoading={credentials.isLoading} emptyMessage={credentials.isError ? getApiErrorMessage(credentials.error) : "No credential versions recorded yet."} searchPlaceholder="Search credentials…" /></CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <SidePanel open={panel !== null} onOpenChange={open => { if (!open) setPanel(null); }}>
      <SidePanelContent>
        <SidePanelHeader className="border-b p-6 text-left">
          <SidePanelTitle>{panel === "registry" ? "Docker Hub connection" : panel === "github-webhook" ? "GitHub webhook secret" : "GitHub App private key"}</SidePanelTitle>
          <SidePanelDescription>{panel === "registry" ? "Save a Docker Hub account for private image pulls. The token is encrypted and is not exposed to application containers." : "Save a new encrypted credential version. The value is cleared after saving and cannot be retrieved later."}</SidePanelDescription>
        </SidePanelHeader>
        {panel === "registry" ? <form className="flex min-h-0 flex-col" onSubmit={event => void rotateRegistry(event)}>
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div className="space-y-1.5"><Label htmlFor="registry-scope">Registry</Label><Input id="registry-scope" autoFocus value={registry} readOnly required /></div>
            <div className="space-y-1.5"><Label htmlFor="registry-username">Docker Hub username</Label><Input id="registry-username" autoComplete="off" value={username} onChange={event => setUsername(event.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="registry-password">Docker Hub access token</Label><Input id="registry-password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required /><p className="text-xs text-muted-foreground">Use a Docker Hub personal access token with read access to the required repositories.</p></div>
          </div>
          <SidePanelFooter className="border-t p-6 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setPanel(null)}>Cancel</Button><Button type="submit" loading={saving} disabled={saving || !registry.trim() || !username.trim() || !password}>{saving ? "Saving…" : registryAction === "rotate" ? "Rotate token" : "Connect account"}</Button></SidePanelFooter>
        </form> : panel === "github-webhook" ? <form className="flex min-h-0 flex-col" onSubmit={event => void rotateGithub(event, "webhook_secret", githubWebhookSecret)}>
          <div className="flex-1 space-y-4 overflow-y-auto p-6"><div className="space-y-1.5"><Label htmlFor="github-webhook-secret">New webhook secret</Label><Input id="github-webhook-secret" type="password" autoComplete="new-password" autoFocus placeholder="Enter a new webhook secret" value={githubWebhookSecret} onChange={event => setGithubWebhookSecret(event.target.value)} required /></div><p className="text-xs text-muted-foreground">GitHub uses this value to sign webhook requests.</p></div>
          <SidePanelFooter className="border-t p-6 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setPanel(null)}>Cancel</Button><Button type="submit" loading={savingGithub} disabled={savingGithub || !githubWebhookSecret}>{savingGithub ? "Saving…" : "Save webhook secret"}</Button></SidePanelFooter>
        </form> : panel === "github-key" ? <form className="flex min-h-0 flex-col" onSubmit={event => void rotateGithub(event, "app_private_key", githubPrivateKey)}>
          <div className="flex-1 space-y-4 overflow-y-auto p-6"><div className="space-y-1.5"><Label htmlFor="github-private-key">GitHub App private key</Label><textarea id="github-private-key" autoFocus className="min-h-56 w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" value={githubPrivateKey} onChange={event => setGithubPrivateKey(event.target.value)} placeholder="Paste PEM private key" required /></div><p className="text-xs text-muted-foreground">Paste the complete PEM key, including its BEGIN and END lines.</p></div>
          <SidePanelFooter className="border-t p-6 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setPanel(null)}>Cancel</Button><Button type="submit" loading={savingGithub} disabled={savingGithub || !githubPrivateKey}>{savingGithub ? "Saving…" : "Save private key"}</Button></SidePanelFooter>
        </form> : null}
      </SidePanelContent>
    </SidePanel>

    <AlertDialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Unlink GitHub?</AlertDialogTitle><AlertDialogDescription>This removes Gatekeeperd’s stored GitHub installation association. You can reconnect the app later.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction loading={unlink.isPending} onClick={async event => { event.preventDefault(); try { await unlink.mutateAsync(); toast.success("GitHub installation unlinked"); } catch (error) { toast.error(getApiErrorMessage(error)); } finally { setUnlinkOpen(false); } }}>Unlink GitHub</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}
