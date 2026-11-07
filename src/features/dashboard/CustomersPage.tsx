import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryState } from "@/components/QueryState";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelFooter, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { getApiErrorMessage } from "@/lib/api";
import { useCreateDashboardCustomer, useDashboardCustomer, useDashboardCustomerTransactions, useDashboardCustomers, useDeleteDashboardCustomer, useUpdateDashboardCustomer } from "@/hooks/useSiteDashboard";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/usePermissions";
import type { DashboardCustomer } from "@/types/sites";

function Money({ value }: { value: number }) { return <span>KES {value.toLocaleString()}</span>; }

export function CustomersPage() {
  const canManageCustomers = useCan("customers.manage");
  const [params, setParams] = useSearchParams();
  const pageSize = 25;
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const search = params.get("q") ?? "";
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };
  const query = useDashboardCustomers(pageSize, page * pageSize, search);
  const [open, setOpen] = useState(false);
  const create = useCreateDashboardCustomer();

  return (
    <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>
      {(result) => (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">Manage customer contacts, project ownership, and billing totals.</p>
            {canManageCustomers && <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />New Customer
            </Button>}
          </div>

          <Card>
            <CardHeader><CardTitle>All customers</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                data={result.customers}
                mode="server"
                total={result.total}
                page={page}
                pageSize={pageSize}
                onPageChange={next => update("page", String(next))}
                search={{ value: search, onChange: value => update("q", value) }}
                searchPlaceholder="Search customers…"
                emptyMessage="No customers found."
                emptyAction={canManageCustomers ? { label: "New Customer", onClick: () => setOpen(true) } : undefined}
                getRowKey={customer => customer.id}
                columns={[
                  { key: "name", header: "Customer", render: customer => <Link className="font-medium text-primary hover:underline" to={`/app/customers/${customer.id}`}>{customer.firstName} {customer.lastName}</Link> },
                  { key: "email", header: "Email", render: customer => customer.contactEmail ?? "No email" },
                  { key: "phone", header: "Phone", render: customer => customer.contactPhone ?? "No phone" },
                  { key: "projects", header: "Projects", render: customer => customer.projectCount },
                  { key: "paid", header: "Paid", render: customer => <Money value={customer.totalPaid} /> },
                  { key: "balance", header: "Balance", render: customer => <Money value={customer.balance} /> },
                ]}
              />
            </CardContent>
          </Card>

          {canManageCustomers && <SidePanel open={open} onOpenChange={setOpen}>
            <SidePanelContent>
              <SidePanelHeader className="border-b px-6 py-5 pr-14">
                <SidePanelTitle>New customer</SidePanelTitle>
                <SidePanelDescription>Add a customer for project ownership and billing.</SidePanelDescription>
              </SidePanelHeader>
              <form className="grid content-start gap-4 px-6 py-5" onSubmit={async event => {
                event.preventDefault();
                const form = event.currentTarget;
                const values = new FormData(form);
                try {
                  await create.mutateAsync({ firstName: String(values.get("firstName")), lastName: String(values.get("lastName")), contactEmail: String(values.get("email") || "") || undefined, contactPhone: String(values.get("phone") || "") || undefined });
                  toast.success("Customer created");
                  form.reset();
                  setOpen(false);
                } catch (error) { toast.error(getApiErrorMessage(error)); }
              }}>
                <div className="space-y-2"><Label htmlFor="customer-first-name">First name</Label><Input id="customer-first-name" name="firstName" placeholder="First name" required /></div>
                <div className="space-y-2"><Label htmlFor="customer-last-name">Last name</Label><Input id="customer-last-name" name="lastName" placeholder="Last name" required /></div>
                <div className="space-y-2"><Label htmlFor="customer-email">Contact email</Label><Input id="customer-email" name="email" type="email" placeholder="name@example.com" /></div>
                <div className="space-y-2"><Label htmlFor="customer-phone">Contact phone</Label><Input id="customer-phone" name="phone" placeholder="Phone number" /></div>
                <SidePanelFooter className="sticky bottom-0 -mx-6 mt-2 border-t bg-background px-6 py-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" loading={create.isPending} disabled={create.isPending}>{create.isPending ? "Creating…" : "Create customer"}</Button>
                </SidePanelFooter>
              </form>
            </SidePanelContent>
          </SidePanel>}
        </div>
      )}
    </QueryState>
  );
}

export function CustomerDetailPage() {
  const id = useParams().id ?? ""; const navigate = useNavigate(); const query = useDashboardCustomer(id); const transactions = useDashboardCustomerTransactions(id);
  const canManageCustomers = useCan("customers.manage");
  return <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data}>{customer => <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{customer.firstName} {customer.lastName}</h2><p className="text-sm text-muted-foreground">Customer details, project ownership, and billing history.</p></div>{canManageCustomers && <CustomerDetailActions customer={customer} onDeleted={() => navigate("/app/customers", { replace: true })} />}</div><div className="grid gap-4 sm:grid-cols-3">{[["Total billed", customer.totalBilled], ["Historically paid", customer.totalPaid], ["Outstanding balance", customer.balance]].map(([label, value]) => <Card key={label as string} className="min-w-0"><CardHeader><CardTitle className="text-sm">{label as string}</CardTitle></CardHeader><CardContent className="text-xl font-semibold"><Money value={value as number} /></CardContent></Card>)}</div><Tabs defaultValue="overview" className="space-y-4"><TabsList className="w-full justify-start overflow-x-auto sm:w-auto"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="projects">Projects</TabsTrigger><TabsTrigger value="transactions">Transactions</TabsTrigger></TabsList><TabsContent value="overview"><div className="grid gap-4 lg:grid-cols-2"><Card className="min-w-0"><CardHeader><CardTitle>Customer overview</CardTitle><p className="text-sm text-muted-foreground">Current ownership and account health.</p></CardHeader><CardContent className="grid min-w-0 gap-4 sm:grid-cols-3"><div className="min-w-0"><p className="text-sm text-muted-foreground">Name</p><p className="break-words font-medium">{customer.firstName} {customer.lastName}</p></div><div className="min-w-0"><p className="text-sm text-muted-foreground">Email</p><p className="break-all">{customer.contactEmail ?? "No email"}</p></div><div className="min-w-0"><p className="text-sm text-muted-foreground">Phone</p><p className="break-words">{customer.contactPhone ?? "No phone"}</p></div></CardContent></Card><Card className="min-w-0"><CardHeader><CardTitle>Billing information</CardTitle><p className="text-sm text-muted-foreground">Billing identity and payment policy.</p></CardHeader><CardContent className="grid min-w-0 gap-4 sm:grid-cols-2"><div className="min-w-0"><p className="text-sm text-muted-foreground">Billing name</p><p className="break-words font-medium">{customer.firstName} {customer.lastName}</p></div><div className="min-w-0"><p className="text-sm text-muted-foreground">Billing email</p><p className="break-all">{customer.contactEmail ?? "No email"}</p></div><div className="min-w-0"><p className="text-sm text-muted-foreground">Billing phone</p><p className="break-words">{customer.contactPhone ?? "No phone"}</p></div><div className="min-w-0"><p className="text-sm text-muted-foreground">Billing status</p><Badge variant="outline" className="max-w-full">{customer.billingStatus}</Badge></div></CardContent></Card></div></TabsContent><TabsContent value="projects"><Card><CardHeader><CardTitle>Projects owned</CardTitle></CardHeader><CardContent><DataTable data={customer.projects ?? []} getRowKey={project => project.id} searchPlaceholder="Search projects…" columns={[{ key: "project", header: "Project", searchable: true, searchValue: project => `${project.name} ${project.slug}`, render: project => project.status === "archived" ? <span className="font-medium text-muted-foreground">{project.name}</span> : <Link className="font-medium text-primary hover:underline" to={`/app/projects/${project.slug}`}>{project.name}</Link> }, { key: "domain", header: "Domain", render: project => project.domain }, { key: "status", header: "Status", render: project => <Badge variant="outline">{project.status}</Badge> }, { key: "paid", header: "Paid", render: project => <Money value={project.totalPaid} /> }, { key: "balance", header: "Balance", render: project => <Money value={project.balance} /> }]} emptyMessage="No projects are linked to this customer." /></CardContent></Card></TabsContent><TabsContent value="transactions"><Card><CardHeader><CardTitle>Transactions</CardTitle><p className="text-sm text-muted-foreground">All recorded payments across this customer’s projects.</p></CardHeader><CardContent><DataTable data={transactions.data ?? []} getRowKey={transaction => transaction.id} isLoading={transactions.isLoading} columns={[{ key: "date", header: "Date", render: transaction => new Date(transaction.paidAt ?? transaction.createdAt).toLocaleDateString() }, { key: "project", header: "Project", searchable: true, searchValue: transaction => `${transaction.projectName} ${transaction.projectSlug}`, render: transaction => <Link className="text-primary hover:underline" to={`/app/projects/${transaction.projectSlug}`}>{transaction.projectName}</Link> }, { key: "amount", header: "Amount", render: transaction => <Money value={transaction.amount} /> }, { key: "status", header: "Status", render: transaction => <Badge variant="outline">{transaction.gatewayStatus}</Badge> }, { key: "provider", header: "Provider", render: transaction => transaction.provider }, { key: "reference", header: "Reference", render: transaction => <span className="break-all font-mono text-xs">{transaction.providerReference}</span> }]} emptyMessage="No transactions recorded for this customer." /></CardContent></Card></TabsContent></Tabs></div>}</QueryState>;
}

function CustomerDetailActions({ customer, onDeleted }: { customer: DashboardCustomer; onDeleted: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [firstName, setFirstName] = useState(customer.firstName);
  const [lastName, setLastName] = useState(customer.lastName);
  const [email, setEmail] = useState(customer.contactEmail ?? "");
  const [phone, setPhone] = useState(customer.contactPhone ?? "");
  const update = useUpdateDashboardCustomer(customer.id);
  const remove = useDeleteDashboardCustomer();
  const openEdit = () => { setFirstName(customer.firstName); setLastName(customer.lastName); setEmail(customer.contactEmail ?? ""); setPhone(customer.contactPhone ?? ""); setEditOpen(true); };
  const save = async () => {
    try { await update.mutateAsync({ firstName, lastName, contactEmail: email || undefined, contactPhone: phone || undefined }); toast.success("Customer updated"); setEditOpen(false); }
    catch (error) { toast.error(getApiErrorMessage(error)); }
  };
  const deleteCustomer = async () => {
    try { await remove.mutateAsync(customer.id); toast.success("Customer deleted"); onDeleted(); }
    catch (error) { toast.error(getApiErrorMessage(error)); }
  };
  return <>
    <div className="flex gap-2"><Button variant="outline" onClick={openEdit}><Pencil />Edit customer</Button><Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 />Delete customer</Button></div>
    <Dialog open={editOpen} onOpenChange={open => { if (!update.isPending) setEditOpen(open); }}><DialogContent><DialogHeader><DialogTitle>Edit customer</DialogTitle><DialogDescription>Update this customer's name and contact details.</DialogDescription></DialogHeader><div className="grid gap-4"><div className="space-y-2"><Label htmlFor="customer-edit-first-name">First name</Label><Input id="customer-edit-first-name" value={firstName} onChange={event => setFirstName(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="customer-edit-last-name">Last name</Label><Input id="customer-edit-last-name" value={lastName} onChange={event => setLastName(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="customer-edit-email">Email</Label><Input id="customer-edit-email" type="email" value={email} onChange={event => setEmail(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="customer-edit-phone">Phone</Label><Input id="customer-edit-phone" value={phone} onChange={event => setPhone(event.target.value)} /></div></div><DialogFooter><Button variant="outline" disabled={update.isPending} onClick={() => setEditOpen(false)}>Cancel</Button><Button loading={update.isPending} loadingText="Saving…" disabled={!firstName.trim() || !lastName.trim() || update.isPending} onClick={() => void save()}>Save changes</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={deleteOpen} onOpenChange={open => { if (!remove.isPending) setDeleteOpen(open); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {customer.firstName} {customer.lastName}?</AlertDialogTitle><AlertDialogDescription>This permanently deletes the customer. Reassign all active and archived projects first; archived projects are included in the Projects tab.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" loading={remove.isPending} disabled={remove.isPending} onClick={event => { event.preventDefault(); void deleteCustomer(); }}>{remove.isPending ? "Deleting…" : "Delete customer"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
