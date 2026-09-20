import { Github, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";

export function ProfileSettingsPage() {
  const email = useAuthStore(s => s.email);
  const role = useAuthStore(s => s.role);
  const githubUrl = import.meta.env.VITE_GITHUB_APP_INSTALL_URL as string | undefined;
  return <div className="max-w-3xl space-y-6">
    <div><p className="text-muted-foreground">Manage your account and connected development services.</p></div>
    <Card><CardHeader><CardTitle>Profile</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="space-y-1"><Label>Email</Label><Input readOnly value={email ?? ""} /></div><div className="space-y-1"><Label>Role</Label><Input readOnly value={role ?? ""} /></div></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Github className="h-5 w-5" /> GitHub access</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Authorize Gatekeeperd’s GitHub App so deployments can clone private repositories and receive repository events.</p>{githubUrl ? <Button asChild><a href={githubUrl} target="_blank" rel="noreferrer">Connect GitHub <ExternalLink className="h-4 w-4" /></a></Button> : <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">GitHub App installation URL is not configured. Set <code>VITE_GITHUB_APP_INSTALL_URL</code> in the frontend environment.</div>}</CardContent></Card>
  </div>;
}

