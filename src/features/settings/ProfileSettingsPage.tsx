import { Github, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import { useGitHubInstallUrl, useGitHubStatus, useUnlinkGitHub } from "@/hooks/useDeployments";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";

export function ProfileSettingsPage() {
  const email = useAuthStore(s => s.email);
  const role = useAuthStore(s => s.role);
  const github = useGitHubStatus();
  const install = useGitHubInstallUrl();
  const unlink = useUnlinkGitHub();
  const connect = async () => {
    try {
      const result = await install.mutateAsync();
      window.location.assign(result.url);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };
  const unlinkGitHub = async () => {
    if (!window.confirm("Unlink the GitHub installation from Gatekeeperd? Deployments will no longer use it until reconnected.")) return;
    try { await unlink.mutateAsync(); toast.success("GitHub installation unlinked"); }
    catch (error) { toast.error(getApiErrorMessage(error)); }
  };
  return <div className="max-w-3xl space-y-6">
    <div><p className="text-muted-foreground">Manage your account and connected development services.</p></div>
    <Card><CardHeader><CardTitle>Profile</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="space-y-1"><Label>Email</Label><Input readOnly value={email ?? ""} /></div><div className="space-y-1"><Label>Role</Label><Input readOnly value={role ?? ""} /></div></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Github className="h-5 w-5" /> GitHub access</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Authorize Gatekeeperd’s GitHub App so deployments can clone private repositories and receive repository events.</p>{github.isLoading ? <p className="text-sm text-muted-foreground">Checking GitHub connection…</p> : github.data?.connected ? <div className="rounded-md border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Connected</p><p className="text-sm text-muted-foreground">{github.data.accountLogin ? `GitHub account: ${github.data.accountLogin}` : "Installation is configured"}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => github.refetch()}><RefreshCw className="h-4 w-4" />Refresh</Button><Button variant="destructive" size="sm" disabled={unlink.isPending} onClick={unlinkGitHub}>{unlink.isPending ? "Unlinking…" : "Unlink"}</Button></div></div></div> : <Button onClick={connect} disabled={install.isPending}><ExternalLink className="h-4 w-4" />{install.isPending ? "Opening GitHub…" : "Connect GitHub"}</Button>}</CardContent></Card>
  </div>;
}
