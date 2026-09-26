import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelFooter, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";

type AdminUser = { id: string; email: string; role: string; twoFactorEnabled: boolean; createdAt: string; active?: boolean };

export function AdminUsersPage() {
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const pageSize = 15;
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const search = params.get("q") ?? "";
  const updateTable = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("admin");
  const users = useQuery({ queryKey: ["admin-users", page, search], queryFn: async () => (await api.get<{ users: AdminUser[]; total: number; limit: number; offset: number; hasMore: boolean }>("/admin/users", { params: { limit: pageSize, offset: page * pageSize, q: search || undefined } })).data });
  const refresh = () => void client.invalidateQueries({ queryKey: ["admin-users"] });
  const create = useMutation({ mutationFn: async () => (await api.post<AdminUser>("/admin/users", { email, password, role })).data, onSuccess: () => { setEmail(""); setPassword(""); setRole("admin"); setCreateOpen(false); refresh(); toast.success("Admin user created"); }, onError: error => toast.error(getApiErrorMessage(error)) });
  const update = useMutation({ mutationFn: async ({ id, changes }: { id: string; changes: Record<string, unknown> }) => api.patch(`/admin/users/${id}`, changes), onSuccess: () => { refresh(); toast.success("User updated"); }, onError: error => toast.error(getApiErrorMessage(error)) });
  const remove = useMutation({ mutationFn: async (id: string) => api.delete(`/admin/users/${id}`), onSuccess: () => { refresh(); toast.success("User deleted"); }, onError: error => toast.error(getApiErrorMessage(error)) });
  const edit = (user: AdminUser) => { setEditing(user); setEditEmail(user.email); setEditRole(user.role); };
  const columns: DataTableColumn<AdminUser>[] = [
    { key: "email", header: "Email", searchable: true, searchValue: user => `${user.email} ${user.role}`, render: user => <div className="min-w-0"><p className="font-medium">{user.email}</p><p className="text-xs text-muted-foreground">{user.role} · {user.twoFactorEnabled ? "2FA enabled" : "2FA disabled"} · {user.active === false ? "Suspended" : "Active"}</p></div> },
    { key: "createdAt", header: "Created", sortable: true, sortValue: user => new Date(user.createdAt).getTime(), render: user => <time className="whitespace-nowrap text-xs text-muted-foreground" dateTime={user.createdAt}>{new Date(user.createdAt).toLocaleDateString()}</time> },
    { key: "actions", header: "Actions", render: user => <div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" onClick={() => edit(user)}>Edit</Button><Button size="sm" variant="outline" onClick={() => update.mutate({ id: user.id, changes: { active: user.active === false } })}>{user.active === false ? "Reactivate" : "Suspend"}</Button><Button size="sm" variant="destructive" onClick={() => { if (window.confirm(`Delete ${user.email}?`)) remove.mutate(user.id); }}>Delete</Button></div> },
  ];

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">Manage administrator and service accounts.</p>
      <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">Create user</Button>
    </div>
    <Card>
      <CardHeader><CardTitle>All admin users</CardTitle></CardHeader>
      <CardContent className="pt-0">
        <DataTable data={users.data?.users ?? []} mode="server" total={users.data?.total ?? 0} page={page} pageSize={pageSize} search={{ value: search, onChange: value => updateTable("q", value) }} searchPlaceholder="Search users…" onPageChange={next => updateTable("page", String(next))} isLoading={users.isLoading} getRowKey={user => user.id} columns={columns} emptyMessage="No admin users found." emptyAction={{ label: "Create user", onClick: () => setCreateOpen(true) }} />
      </CardContent>
    </Card>

    <SidePanel open={createOpen} onOpenChange={setCreateOpen}>
      <SidePanelContent>
        <SidePanelHeader className="border-b px-6 py-5 pr-14"><SidePanelTitle>Create admin user</SidePanelTitle><SidePanelDescription>Create a service account or another administrator.</SidePanelDescription></SidePanelHeader>
        <form className="grid content-start gap-4 px-6 py-5" onSubmit={event => { event.preventDefault(); create.mutate(); }}>
          <div className="space-y-2"><Label htmlFor="new-user-email">Email</Label><Input id="new-user-email" required type="email" value={email} onChange={event => setEmail(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="new-user-password">Password</Label><Input id="new-user-password" required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="new-user-role">Role</Label><select id="new-user-role" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={event => setRole(event.target.value)}><option value="admin">Admin</option><option value="operator">Operator</option><option value="viewer">Viewer</option></select></div>
          <p className="text-xs text-muted-foreground">Two-factor authentication is disabled initially.</p>
          <SidePanelFooter className="sticky bottom-0 -mx-6 mt-2 border-t bg-background px-6 py-4"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create user"}</Button></SidePanelFooter>
        </form>
      </SidePanelContent>
    </SidePanel>

    <SidePanel open={editing !== null} onOpenChange={open => { if (!open) setEditing(null); }}>
      <SidePanelContent>
        <SidePanelHeader className="border-b px-6 py-5 pr-14"><SidePanelTitle>Edit admin user</SidePanelTitle><SidePanelDescription>Update the account email or role.</SidePanelDescription></SidePanelHeader>
        <form className="grid content-start gap-4 px-6 py-5" onSubmit={event => { event.preventDefault(); if (editing) update.mutate({ id: editing.id, changes: { email: editEmail, role: editRole } }); }}>
          <div className="space-y-2"><Label htmlFor="edit-user-email">Email</Label><Input id="edit-user-email" required type="email" value={editEmail} onChange={event => setEditEmail(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="edit-user-role">Role</Label><select id="edit-user-role" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={editRole} onChange={event => setEditRole(event.target.value)}><option value="admin">Admin</option><option value="operator">Operator</option><option value="viewer">Viewer</option></select></div>
          <SidePanelFooter className="sticky bottom-0 -mx-6 mt-2 border-t bg-background px-6 py-4"><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save changes"}</Button></SidePanelFooter>
        </form>
      </SidePanelContent>
    </SidePanel>
  </div>;
}
