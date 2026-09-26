import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Github, History, KeyRound, RotateCw } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProviderCredentialMetadata } from "@/types/project";
import { toast } from "sonner";

export function InfrastructureCredentialsPage() {
  const queryClient = useQueryClient();
  const [registry, setRegistry] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [githubWebhookSecret, setGithubWebhookSecret] = useState("");
  const [githubPrivateKey, setGithubPrivateKey] = useState("");
  const [savingGithub, setSavingGithub] = useState(false);
  const credentials = useQuery({
    queryKey: ["provider-credentials-metadata"],
    queryFn: async () => (await api.get<ProviderCredentialMetadata[]>("/admin/project-setup/provider-credentials")).data,
  });
  const history = useMemo(() => [...(credentials.data ?? [])].sort((a, b) => a.provider.localeCompare(b.provider) || a.scope.localeCompare(b.scope) || b.version - a.version), [credentials.data]);
  const rotateRegistry = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/registries/${encodeURIComponent(registry.trim().toLowerCase())}`, { username, password });
      setUsername("");
      setPassword("");
      await queryClient.invalidateQueries({ queryKey: ["provider-credentials-metadata"] });
      toast.success("Registry credential rotated");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const rotateGithub = async (type: "webhook_secret" | "app_private_key", value: string) => {
    setSavingGithub(true);
    try {
      await api.put(`/admin/github/credentials/${type}`, { value });
      if (type === "webhook_secret") setGithubWebhookSecret(""); else setGithubPrivateKey("");
      await queryClient.invalidateQueries({ queryKey: ["provider-credentials-metadata"] });
      toast.success("GitHub credential rotated");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSavingGithub(false);
    }
  };

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5 text-primary" /> Container registry</CardTitle>
          <CardDescription>Set or rotate credentials for a private image registry. A save creates a new encrypted version.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="registry-scope">Registry host or scope</Label><Input id="registry-scope" placeholder="docker.io or registry.example.com" value={registry} onChange={event => setRegistry(event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="registry-username">Username</Label><Input id="registry-username" autoComplete="off" value={username} onChange={event => setUsername(event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="registry-password">Password or access token</Label><Input id="registry-password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></div>
          </div>
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">The previous version remains available in history.</p>
            <Button className="sm:min-w-40" disabled={saving || !registry.trim() || !username.trim() || !password} onClick={() => void rotateRegistry()}><RotateCw className="h-4 w-4" />{saving ? "Saving…" : "Save registry credential"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2"><Github className="h-5 w-5" /> GitHub access</CardTitle>
          <CardDescription>Rotate webhook verification and GitHub App credentials used by integrations and deployments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <div><h3 className="text-sm font-medium">Webhook secret</h3><p className="mt-0.5 text-xs text-muted-foreground">Verifies incoming GitHub webhook requests.</p></div>
            <div className="flex flex-col gap-3 sm:flex-row"><Input aria-label="GitHub webhook secret" type="password" autoComplete="new-password" placeholder="Enter a new webhook secret" value={githubWebhookSecret} onChange={event => setGithubWebhookSecret(event.target.value)} /><Button variant="outline" disabled={savingGithub || !githubWebhookSecret} onClick={() => void rotateGithub("webhook_secret", githubWebhookSecret)}>{savingGithub ? "Saving…" : "Save secret"}</Button></div>
          </section>
          <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <div><h3 className="text-sm font-medium">GitHub App private key</h3><p className="mt-0.5 text-xs text-muted-foreground">Used to authenticate GitHub App operations.</p></div>
            <textarea aria-label="GitHub App private key" className="min-h-28 w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" value={githubPrivateKey} onChange={event => setGithubPrivateKey(event.target.value)} placeholder="Paste PEM private key" />
            <div className="flex justify-end"><Button variant="outline" disabled={savingGithub || !githubPrivateKey} onClick={() => void rotateGithub("app_private_key", githubPrivateKey)}>{savingGithub ? "Saving…" : "Save private key"}</Button></div>
          </section>
          <p className="text-xs text-muted-foreground">Saved values are cleared from these fields and cannot be retrieved later.</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b pb-4">
        <div className="space-y-1"><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Version history</CardTitle><CardDescription>Provider, scope, and rotation metadata only. Secret values are never requested here.</CardDescription></div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{history.length} {history.length === 1 ? "version" : "versions"}</span>
      </CardHeader>
      <CardContent className="pt-4">
        {credentials.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading credential metadata…</p>
          : credentials.isError ? <div className="py-8 text-center"><p className="text-sm text-destructive">{getApiErrorMessage(credentials.error)}</p><Button className="mt-3" variant="outline" size="sm" onClick={() => void credentials.refetch()}>Try again</Button></div>
          : history.length === 0 ? <div className="rounded-lg border border-dashed px-5 py-10 text-center"><KeyRound className="mx-auto h-5 w-5 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No credential versions yet</p><p className="mt-1 text-sm text-muted-foreground">Saved registry or GitHub credentials will appear here.</p></div>
          : <div className="divide-y">{history.map(item => <div key={item.id} className="flex flex-col gap-3 py-4 first:pt-1 last:pb-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{item.displayName || item.scope}</p><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">{item.provider}</span><span className="text-xs text-muted-foreground">v{item.version}</span></div>
              <p className="break-words text-xs text-muted-foreground">{item.type} <span aria-hidden="true">·</span> {item.scope}</p>
              <p className="text-xs text-muted-foreground">Created {new Date(item.createdAt).toLocaleString()}{item.rotatedAt ? ` · rotated ${new Date(item.rotatedAt).toLocaleString()}` : ""}</p>
            </div>
            <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.current ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}><span className={`h-1.5 w-1.5 rounded-full ${item.current ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />{item.current ? "Current" : "Superseded"}</span>
          </div>)}</div>}
      </CardContent>
    </Card>
  </div>;
}
