import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/QueryState";
import { useDashboardCustomer, useDashboardCustomers, useDashboardSites } from "@/hooks/useSiteDashboard";
import { useCreateDashboardCustomer, useAssignProjectCustomer } from "@/hooks/useSiteDashboard";
import { useProjects } from "@/hooks/useProjects";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelFooter, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";

function CustomerSites({ id, sites }: { id: string; sites: ReturnType<typeof useDashboardSites>["data"] }) {
  const customerSites = (sites ?? []).filter(site => site.customerId === id);
  return <div className="mt-3 space-y-2 border-t pt-3">{customerSites.length ? customerSites.map(site => <Link key={site.slug} to={`/app/nginx/sites/${site.slug}`} className="flex justify-between rounded-md border p-2 text-sm hover:bg-muted"><span>{site.domain}</span><Badge variant="outline">{site.status.replace(/_/g, " ")}</Badge></Link>) : <p className="text-sm text-muted-foreground">No sites assigned.</p>}</div>;
}

function StatusSummary({ health }: { health: Record<string, number> }) { return <div className="flex flex-wrap gap-1">{Object.entries(health).map(([status, count]) => <Badge key={status} variant="outline">{status.replace(/_/g, " ")}: {count}</Badge>)}</div>; }

export function CustomersPage() {
  const query = useDashboardCustomers();
  const sites = useDashboardSites();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [panel, setPanel] = useState<"customer" | "project" | null>(null);
  const create = useCreateDashboardCustomer();
  const assign = useAssignProjectCustomer();
  const projects = useProjects();
  return <QueryState isLoading={query.isLoading || sites.isLoading} isError={query.isError || sites.isError} error={query.error ?? sites.error} data={query.data}>{customers => <div className="space-y-6"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Customers</h1><p className="text-muted-foreground">Ownership and aggregate site health.</p></div><div className="flex gap-2"><Button onClick={() => setPanel("customer")}>New customer</Button><Button variant="outline" onClick={() => setPanel("project")}>Assign project</Button></div></div><div className="grid gap-4">{customers.map(customer => { const open = expanded === customer.id; return <Card key={customer.id}><CardHeader className="cursor-pointer" onClick={() => setExpanded(open ? null : customer.id)}><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-2">{open ? <ChevronDown className="mt-0.5 h-4 w-4" /> : <ChevronRight className="mt-0.5 h-4 w-4" />}<div><CardTitle>{customer.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{customer.contactEmail ?? "No email"} · {customer.siteCount} sites</p></div></div><StatusSummary health={customer.health} /></div></CardHeader>{open && <CardContent><CustomerSites id={customer.id} sites={sites.data} /><Link className="mt-3 inline-block text-sm text-primary hover:underline" to={`/app/customers/${customer.id}`}>Open customer detail →</Link></CardContent>}</Card>; })}</div><SidePanel open={panel !== null} onOpenChange={open => !open && setPanel(null)}><SidePanelContent><SidePanelHeader className="border-b px-6 py-5 text-left"><SidePanelTitle>{panel === "customer" ? "New customer" : "Assign project"}</SidePanelTitle><SidePanelDescription>{panel === "customer" ? "Add a customer for site ownership tracking." : "Assign an existing project to a customer."}</SidePanelDescription></SidePanelHeader>{panel === "customer" ? <form className="grid gap-4 px-6 py-5" onSubmit={async event => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await create.mutateAsync({ name: String(form.get("name")), contactEmail: String(form.get("email") || "") || undefined, contactPhone: String(form.get("phone") || "") || undefined }); toast.success("Customer created"); setPanel(null); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><Input name="name" placeholder="Customer name" required /><Input name="email" type="email" placeholder="Contact email" /><Input name="phone" placeholder="Contact phone" /><SidePanelFooter><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create customer"}</Button></SidePanelFooter></form> : <form className="grid gap-4 px-6 py-5" onSubmit={async event => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await assign.mutateAsync({ projectId: String(form.get("projectId")), customerId: String(form.get("customerId")) }); toast.success("Project assigned"); setPanel(null); } catch (error) { toast.error(getApiErrorMessage(error)); } }}><select name="projectId" required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="">Select project</option>{(projects.data ?? []).map(project => <option key={project.id} value={project.id}>{project.name} ({project.slug})</option>)}</select><select name="customerId" required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="">Select customer</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><SidePanelFooter><Button type="submit" disabled={assign.isPending}>{assign.isPending ? "Assigning…" : "Assign project"}</Button></SidePanelFooter></form>}</SidePanelContent></SidePanel></div>}</QueryState>;
}

export function CustomerDetailPage() {
  const id = useParams().id ?? "";
  const query = useDashboardCustomer(id);
  const sites = useDashboardSites();
  return <QueryState isLoading={query.isLoading || sites.isLoading} isError={query.isError || sites.isError} error={query.error ?? sites.error} data={query.data}>{customer => <div className="space-y-6"><Link to="/app/customers" className="text-sm text-primary hover:underline">← All customers</Link><div><h1 className="text-2xl font-semibold">{customer.name}</h1><p className="text-muted-foreground">{customer.contactEmail ?? "No email"} · {customer.siteCount} sites</p></div><Card><CardHeader><CardTitle>Site health</CardTitle></CardHeader><CardContent><StatusSummary health={customer.health} /><div className="mt-4 space-y-2">{(sites.data ?? []).filter(site => site.customerId === id).map(site => <Link key={site.slug} to={`/app/nginx/sites/${site.slug}`} className="flex justify-between rounded-md border p-3 text-sm hover:bg-muted"><span>{site.domain}</span><Badge variant="outline">{site.status.replace(/_/g, " ")}</Badge></Link>)}</div></CardContent></Card></div>}</QueryState>;
}
