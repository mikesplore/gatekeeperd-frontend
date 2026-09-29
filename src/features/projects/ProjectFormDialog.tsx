import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelFooter, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateProject } from "@/hooks/useProjects";
import { useDashboardCustomers } from "@/hooks/useSiteDashboard";
import { getApiErrorMessage } from "@/lib/api";
import type { Project, UpdateProjectPayload } from "@/types/project";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["frontend", "backend"]),
  billingName: z.string().optional(),
  billingEmail: z.string().email().optional().or(z.literal("")),
  billingAddress: z.string().optional(),
  amountDue: z.coerce.number().nonnegative().optional(),
  dueDate: z.string().optional(),
  gracePeriodDays: z.coerce.number().int().nonnegative(),
  customerId: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function ProjectFormDialog({ open, onOpenChange, project }: { open: boolean; onOpenChange: (open: boolean) => void; project?: Project | null }) {
  const update = useUpdateProject(project?.slug ?? "");
  const customers = useDashboardCustomers();
  const [billingSameAsCustomer, setBillingSameAsCustomer] = useState(false);
  const { register, handleSubmit, reset, setValue, watch, setError, setFocus, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { type: "frontend", gracePeriodDays: 3 } });
  const type = watch("type");
  const customerId = watch("customerId");
  const selectedCustomer = customers.data?.customers.find(customer => customer.id === customerId);
  useEffect(() => {
    if (open && project) reset({ name: project.name, type: project.type, amountDue: project.amountDue, dueDate: project.dueDate?.slice(0, 10) ?? "", gracePeriodDays: project.gracePeriodDays, billingName: project.billingName ?? "", billingEmail: project.billingEmail ?? "", billingAddress: project.billingAddress ?? "", customerId: project.customerId ?? "" });
  }, [open, project, reset]);
  const onSubmit = (values: Values) => {
    const payload: UpdateProjectPayload = { ...values, dueDate: values.dueDate || undefined, customerId: values.customerId || undefined };
    update.mutate(payload, { onSuccess: () => { toast.success("Project updated"); onOpenChange(false); }, onError: (error) => {
      const message = getApiErrorMessage(error); const lower = message.toLowerCase();
      const field: keyof Values | null = lower.includes("email") ? "billingEmail" : null;
      if (field) { setError(field, { type: "server", message }); setFocus(field); }
      toast.error(message);
    } });
  };
  return <SidePanel open={open} onOpenChange={onOpenChange}><SidePanelContent>
    <SidePanelHeader className="border-b px-6 py-5 pr-14"><SidePanelTitle className="text-base">Edit project</SidePanelTitle><SidePanelDescription className="text-xs">Update business, access, and billing details. Deployment settings are managed in project setup.</SidePanelDescription></SidePanelHeader>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-6 text-sm [&_label]:text-xs [&_input]:h-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Project</Label><Input value={project?.name ?? ""} disabled /></div>
        <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" {...register("name")} />{errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}</div>
        <div className="space-y-2"><Label>Type</Label><Select value={type} onValueChange={(value) => setValue("type", value as Values["type"])}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="frontend">Frontend</SelectItem><SelectItem value="backend">Backend</SelectItem></SelectContent></Select></div>
      </div>
      <div className="space-y-3"><Label>Customer</Label><Select value={customerId || ""} onValueChange={value => setValue("customerId", value)}><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select a customer" /></SelectTrigger><SelectContent>{customers.data?.customers.map(customer => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="gracePeriodDays">Grace period (days)</Label><Input id="gracePeriodDays" type="number" {...register("gracePeriodDays")} /></div>
        <div className="space-y-2"><Label htmlFor="amountDue">Amount due</Label><Input id="amountDue" type="number" step="0.01" {...register("amountDue")} /></div>
        <div className="space-y-2"><Label htmlFor="dueDate">Due date</Label><Input id="dueDate" type="date" {...register("dueDate")} /></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={billingSameAsCustomer} onChange={event => { const checked = event.target.checked; setBillingSameAsCustomer(checked); if (checked) { setValue("billingName", selectedCustomer?.name ?? ""); setValue("billingEmail", selectedCustomer?.contactEmail ?? ""); } }} /><span>Billing information matches customer</span></label>
        {!billingSameAsCustomer && <><div className="space-y-2"><Label htmlFor="billingName">Billing name</Label><Input id="billingName" {...register("billingName")} /></div><div className="space-y-2"><Label htmlFor="billingEmail">Billing email</Label><Input id="billingEmail" type="email" {...register("billingEmail")} />{errors.billingEmail && <p className="text-sm text-destructive">{errors.billingEmail.message}</p>}</div><div className="space-y-2 sm:col-span-2"><Label htmlFor="billingAddress">Billing address</Label><Input id="billingAddress" {...register("billingAddress")} /></div></>}
      </div>
      <SidePanelFooter className="sticky bottom-0 -mx-6 -mb-6 mt-2 border-t bg-background px-6 py-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save changes"}</Button></SidePanelFooter>
    </form>
  </SidePanelContent></SidePanel>;
}
