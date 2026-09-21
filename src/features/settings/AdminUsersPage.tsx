import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type AdminUser = { id: string; email: string; role: string; twoFactorEnabled: boolean; createdAt: string };

export function AdminUsersPage() {
  const client = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [open, setOpen] = useState(false);
  const users = useQuery({ queryKey: ["admin-users"], queryFn: async () => (await api.get<AdminUser[]>("/admin/users")).data });
  const create = useMutation({
    mutationFn: async () => (await api.post<AdminUser>("/admin/users", { email, password, role })).data,
    onSuccess: () => { setEmail(""); setPassword(""); setRole("admin"); setOpen(false); void client.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Admin user created"); },
    onError: error => toast.error(getApiErrorMessage(error)),
  });
  return <div className="space-y-6"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Admin users</h1><p className="text-muted-foreground">Manage administrator and service accounts.</p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button>Create user</Button></DialogTrigger><DialogContent className="left-auto right-0 top-0 h-full max-w-md translate-x-0 translate-y-0 rounded-none sm:rounded-l-lg"><DialogHeader><DialogTitle>Create admin user</DialogTitle><DialogDescription>Create a service account for Scribed or another administrator.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={event => { event.preventDefault(); create.mutate(); }}><div><Label>Email</Label><Input required type="email" value={email} onChange={event => setEmail(event.target.value)} /></div><div><Label>Password</Label><Input required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} /></div><div><Label>Role</Label><select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm" value={role} onChange={event => setRole(event.target.value)}><option value="admin">Admin</option><option value="operator">Operator</option><option value="viewer">Viewer</option></select></div><p className="text-xs text-muted-foreground">Two-factor authentication is disabled initially. The user can enable it from Profile settings.</p><DialogFooter><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create user"}</Button></DialogFooter></form></DialogContent></Dialog></div>
    <Card><CardHeader><CardTitle className="text-sm">Existing users</CardTitle></CardHeader><CardContent>{users.isLoading ? <p className="text-sm text-muted-foreground">Loading users…</p> : users.isError ? <p className="text-sm text-destructive">Unable to load users.</p> : <div className="space-y-2">{users.data?.map(user => <div key={user.id} className="flex items-center justify-between rounded-md border p-3 text-sm"><span>{user.email}</span><span className="text-muted-foreground">{user.role} · {user.twoFactorEnabled ? "2FA enabled" : "2FA disabled"}</span></div>)}</div>}</CardContent></Card>
  </div>;
}
