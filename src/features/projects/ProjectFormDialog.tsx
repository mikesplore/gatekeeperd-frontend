import { useEffect } from "react";
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
  customerId: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function ProjectFormDialog({ open, onOpenChange, project }: { open: boolean; onOpenChange: (open: boolean) => void; project?: Project | null }) {
  const update = useUpdateProject(project?.slug ?? "");
  const customers = useDashboardCustomers();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });
  const customerId = watch("customerId");
  useEffect(() => {
    if (open && project) reset({ name: project.name, customerId: project.customerId ?? "" });
  }, [open, project, reset]);
  const onSubmit = (values: Values) => {
    const payload: UpdateProjectPayload = { ...values, customerId: values.customerId || undefined };
    update.mutate(payload, { onSuccess: () => { toast.success("Project updated"); onOpenChange(false); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  };
  return <SidePanel open={open} onOpenChange={onOpenChange}><SidePanelContent>
    <SidePanelHeader className="border-b px-6 py-5 pr-14"><SidePanelTitle className="text-base">Edit project</SidePanelTitle><SidePanelDescription className="text-xs">Update project identity and customer association. Manage deployments and billing on their respective services.</SidePanelDescription></SidePanelHeader>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-6 text-sm [&_label]:text-xs [&_input]:h-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Project</Label><Input value={project?.name ?? ""} disabled /></div>
        <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" {...register("name")} />{errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}</div>
      </div>
      <div className="space-y-3"><Label>Customer</Label><Select value={customerId || ""} onValueChange={value => setValue("customerId", value)}><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select a customer" /></SelectTrigger><SelectContent>{customers.data?.customers.map(customer => <SelectItem key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName}</SelectItem>)}</SelectContent></Select></div>
      <SidePanelFooter className="sticky bottom-0 -mx-6 -mb-6 mt-2 border-t bg-background px-6 py-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" loading={update.isPending} disabled={update.isPending}>{update.isPending ? "Saving…" : "Save changes"}</Button></SidePanelFooter>
    </form>
  </SidePanelContent></SidePanel>;
}
