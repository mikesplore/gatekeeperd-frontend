import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelFooter, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCan } from "@/hooks/usePermissions";

type Permission = { code: string; category: string; action: string; description: string };
type Role = { id: string; key: string; displayName: string; description: string | null; superAdmin: boolean; active: boolean; permissions: string[] };

export function RolesPage() {
  const canManageRoles = useCan("roles.manage");
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Role | null>(null);
  const [key, setKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const permissions = useQuery({ queryKey: ["rbac-permissions"], queryFn: async () => (await api.get<Permission[]>("/admin/rbac/permissions")).data });
  const roles = useQuery({ queryKey: ["rbac-roles"], queryFn: async () => (await api.get<Role[]>("/admin/rbac/roles")).data });
  const grouped = useMemo(() => (permissions.data ?? []).reduce<Record<string, Permission[]>>((result, item) => {
    (result[item.category] ??= []).push(item);
    return result;
  }, {}), [permissions.data]);
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["rbac-roles"] });
    void client.invalidateQueries({ queryKey: ["auth", "me"] });
  };
  const save = useMutation({
    mutationFn: async () => editing
      ? api.put(`/admin/rbac/roles/${encodeURIComponent(editing.key)}`, { displayName, description: description || null, active, permissions: selected })
      : api.post("/admin/rbac/roles", { key, displayName, description: description || null, permissions: selected }),
    onSuccess: () => { refresh(); setOpen(false); toast.success(editing ? "Role updated" : "Role created"); },
    onError: error => toast.error(getApiErrorMessage(error)),
  });
  const remove = useMutation({ mutationFn: async (roleKey: string) => api.delete(`/admin/rbac/roles/${encodeURIComponent(roleKey)}`), onSuccess: () => { refresh(); setRemoveTarget(null); toast.success("Role deleted"); }, onError: error => toast.error(getApiErrorMessage(error)) });
  const startCreate = () => { setEditing(null); setKey(""); setDisplayName(""); setDescription(""); setActive(true); setSelected([]); setOpen(true); };
  const startEdit = (role: Role) => { setEditing(role); setKey(role.key); setDisplayName(role.displayName); setDescription(role.description ?? ""); setActive(role.active); setSelected(role.permissions); setOpen(true); };
  const toggle = (code: string) => setSelected(current => current.includes(code) ? current.filter(item => item !== code) : [...current, code]);

  return <div className="space-y-6">
    <div className="flex justify-end">
      {canManageRoles && <Button onClick={startCreate}>Create role</Button>}
    </div>
    {roles.isError && <p role="alert" className="text-sm text-destructive">{getApiErrorMessage(roles.error)}</p>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {(roles.data ?? []).map(role => <Card key={role.key}>
        <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>{role.displayName}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{role.key} · {role.superAdmin ? "Built-in superuser" : role.active ? "Active" : "Inactive"}</p></div>{canManageRoles && <Button size="sm" variant="outline" disabled={role.superAdmin} onClick={() => startEdit(role)}>Edit</Button>}</CardHeader>
        <CardContent className="space-y-3"><p className="min-h-5 text-sm text-muted-foreground">{role.description || "No description"}</p><p className="text-sm">{role.superAdmin ? "All permissions" : `${role.permissions.length} permissions`}</p>{canManageRoles && !role.superAdmin && <div className="flex gap-2"><Button size="sm" variant="outline" disabled={remove.isPending} onClick={() => setRemoveTarget(role)}>Delete</Button>{!role.active && <span className="self-center text-xs text-destructive">Inactive roles cannot access admin routes</span>}</div>}</CardContent>
      </Card>)}
    </div>
    <SidePanel open={open} onOpenChange={setOpen}><SidePanelContent>
      <SidePanelHeader className="border-b px-6 py-5 pr-14"><SidePanelTitle>{editing ? "Edit role" : "Create role"}</SidePanelTitle><SidePanelDescription>Choose the exact permissions this role can use.</SidePanelDescription></SidePanelHeader>
      <form className="grid content-start gap-5 overflow-y-auto px-6 py-5" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
        {!editing && <div className="space-y-2"><Label htmlFor="role-key">Role key</Label><Input id="role-key" required minLength={2} maxLength={64} pattern="[a-z][a-z0-9_-]{1,63}" value={key} onChange={event => setKey(event.target.value.toLowerCase())} placeholder="billing_operator" /></div>}
        <div className="space-y-2"><Label htmlFor="role-name">Display name</Label><Input id="role-name" required maxLength={100} value={displayName} onChange={event => setDisplayName(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="role-description">Description</Label><Input id="role-description" maxLength={500} value={description} onChange={event => setDescription(event.target.value)} /></div>
        {editing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} /> Role is active</label>}
        <div className="space-y-4"><h3 className="font-medium">Permissions</h3>{Object.entries(grouped).map(([category, items]) => <fieldset key={category} className="space-y-2 rounded-md border p-3"><legend className="px-1 text-sm font-medium capitalize">{category}</legend>{(items ?? []).map(permission => <label key={permission.code} className="flex cursor-pointer gap-2 text-sm"><input type="checkbox" checked={selected.includes(permission.code)} onChange={() => toggle(permission.code)} /><span><span className="font-medium">{permission.code}</span><span className="block text-xs text-muted-foreground">{permission.description}</span></span></label>)}</fieldset>)}</div>
        <SidePanelFooter className="sticky bottom-0 -mx-6 border-t bg-background px-6 py-4"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={save.isPending} disabled={save.isPending || permissions.isLoading}>{save.isPending ? "Saving…" : "Save role"}</Button></SidePanelFooter>
      </form>
    </SidePanelContent></SidePanel>
    <AlertDialog open={removeTarget !== null} onOpenChange={isOpen => { if (!isOpen && !remove.isPending) setRemoveTarget(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {removeTarget?.displayName}?</AlertDialogTitle><AlertDialogDescription>This permanently deletes the role. Roles assigned to users cannot be deleted; reassign those users first.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" loading={remove.isPending} disabled={remove.isPending || !removeTarget} onClick={event => { event.preventDefault(); if (removeTarget) remove.mutate(removeTarget.key); }}>{remove.isPending ? "Deleting…" : "Delete role"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}
