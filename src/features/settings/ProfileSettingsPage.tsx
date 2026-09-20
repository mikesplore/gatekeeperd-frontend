import { Github, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import { useGitHubInstallUrl, useGitHubStatus, useUnlinkGitHub } from "@/hooks/useDeployments";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function ProfileSettingsPage() {
  const email = useAuthStore(s => s.email);
  const role = useAuthStore(s => s.role);
  const github = useGitHubStatus();
  const install = useGitHubInstallUrl();
  const unlink = useUnlinkGitHub();
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const profile = useMutation({ mutationFn: () => api.patch("/auth/me", { displayName, avatarUrl }) });
  const password = useMutation({ mutationFn: () => api.post("/auth/password", { currentPassword, newPassword }) });
  const connect = async () => {
    try {
      const result = await install.mutateAsync();
      window.location.assign(result.url);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };
  const unlinkGitHub = async () => {
    try { await unlink.mutateAsync(); toast.success("GitHub installation unlinked"); }
    catch (error) { toast.error(getApiErrorMessage(error)); }
    finally { setUnlinkOpen(false); }
  };
  return <div className="max-w-3xl space-y-6">
    <div><p className="text-muted-foreground">Manage your account and connected development services.</p></div>
    <Card><CardHeader><CardTitle>Profile</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1"><Label>Email</Label><Input readOnly value={email ?? ""} /></div><div className="space-y-1"><Label>Role</Label><Input readOnly value={role ?? ""} /></div><div className="space-y-1"><Label>Display name</Label><Input value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Your name" maxLength={80} /></div><div className="space-y-1"><Label>Profile picture URL</Label><Input value={avatarUrl} onChange={event => setAvatarUrl(event.target.value)} placeholder="https://…" maxLength={500} /></div></div><Button disabled={profile.isPending} onClick={async () => { try { await profile.mutateAsync(); toast.success("Profile updated"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>{profile.isPending ? "Saving…" : "Save profile"}</Button></CardContent></Card>
    <Card><CardHeader><CardTitle>Password</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1"><Label>Current password</Label><Input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></div><div className="space-y-1"><Label>New password</Label><Input type="password" minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} /></div></div><Button disabled={password.isPending || !currentPassword || newPassword.length < 8} onClick={async () => { try { await password.mutateAsync(); setCurrentPassword(""); setNewPassword(""); toast.success("Password changed"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>{password.isPending ? "Changing…" : "Change password"}</Button></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Github className="h-5 w-5" /> GitHub access</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Authorize Gatekeeperd’s GitHub App so deployments can clone private repositories and receive repository events.</p>{github.isLoading ? <p className="text-sm text-muted-foreground">Checking GitHub connection…</p> : github.data?.connected ? <div className="rounded-md border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Connected</p><p className="text-sm text-muted-foreground">{github.data.accountLogin ? `GitHub account: ${github.data.accountLogin}` : "Installation is configured"}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => github.refetch()}><RefreshCw className="h-4 w-4" />Refresh</Button><Button variant="destructive" size="sm" disabled={unlink.isPending} onClick={() => setUnlinkOpen(true)}>{unlink.isPending ? "Unlinking…" : "Unlink"}</Button></div></div></div> : <Button onClick={connect} disabled={install.isPending}><ExternalLink className="h-4 w-4" />{install.isPending ? "Opening GitHub…" : "Connect GitHub"}</Button>}</CardContent></Card>
    <AlertDialog open={unlinkOpen} onOpenChange={setUnlinkOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Unlink GitHub?</AlertDialogTitle><AlertDialogDescription>This removes Gatekeeperd’s stored GitHub installation association. It does not uninstall the GitHub App from GitHub, and deployments will stop using it until reconnected.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={unlink.isPending} onClick={unlinkGitHub}>{unlink.isPending ? "Unlinking…" : "Unlink GitHub"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
