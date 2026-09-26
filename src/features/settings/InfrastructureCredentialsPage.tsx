import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  return <div className="max-w-5xl space-y-6">
    <div><h1 className="text-2xl font-semibold">Infrastructure credentials</h1><p className="text-sm text-muted-foreground">Registry and GitHub credential versions. Values are write-only and never shown after saving.</p></div>
    <Card><CardHeader><CardTitle>Rotate registry credential</CardTitle><CardDescription>Saving creates a new encrypted version and marks the previous version superseded.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-1"><Label>Registry scope</Label><Input placeholder="docker.io" value={registry} onChange={event => setRegistry(event.target.value)} /></div>
      <div className="space-y-1"><Label>Username</Label><Input autoComplete="off" value={username} onChange={event => setUsername(event.target.value)} /></div>
      <div className="space-y-1"><Label>Password or token</Label><Input type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></div>
      <div className="sm:col-span-3"><Button disabled={saving || !registry.trim() || !username.trim() || !password} onClick={() => void rotateRegistry()}>{saving ? "Saving…" : "Save new version"}</Button></div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Rotate GitHub credentials</CardTitle><CardDescription>New versions are encrypted and supersede the previous version. Values are cleared after a successful save.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2"><Label>Webhook secret</Label><Input type="password" autoComplete="new-password" value={githubWebhookSecret} onChange={event => setGithubWebhookSecret(event.target.value)} /><Button disabled={savingGithub || !githubWebhookSecret} onClick={() => void rotateGithub("webhook_secret", githubWebhookSecret)}>Save webhook secret</Button></div>
      <div className="space-y-2"><Label>GitHub App private key</Label><textarea className="min-h-24 w-full rounded-md border bg-background p-2 font-mono text-xs" value={githubPrivateKey} onChange={event => setGithubPrivateKey(event.target.value)} placeholder="Paste PEM private key" /><Button disabled={savingGithub || !githubPrivateKey} onClick={() => void rotateGithub("app_private_key", githubPrivateKey)}>Save private key</Button></div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Credential versions</CardTitle><CardDescription>Metadata only. No credential payload or plaintext values are requested by this page.</CardDescription></CardHeader><CardContent>
      {credentials.isLoading ? <p className="text-sm text-muted-foreground">Loading metadata…</p> : credentials.isError ? <p className="text-sm text-destructive">{getApiErrorMessage(credentials.error)}</p> : history.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No provider credentials are recorded.</p> : <div className="space-y-2">{history.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div><p className="font-medium">{item.displayName || item.scope}</p><p className="text-xs text-muted-foreground">{item.provider} · {item.type} · {item.scope} · version {item.version}</p><p className="text-xs text-muted-foreground">Created {new Date(item.createdAt).toLocaleString()}{item.rotatedAt ? ` · rotated ${new Date(item.rotatedAt).toLocaleString()}` : ""}</p></div><span className={`rounded-full px-2 py-1 text-xs ${item.current ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{item.current ? "Current" : "Superseded"}</span></div>)}</div>}
    </CardContent></Card>
  </div>;
}
