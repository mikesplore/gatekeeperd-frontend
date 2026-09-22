import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/ui/side-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCreateProject, useProjectWizardContext, useUpdateProject } from "@/hooks/useProjects";
import { useDashboardCustomers } from "@/hooks/useSiteDashboard";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import type { CreateProjectPayload, Project, UpdateProjectPayload } from "@/types/project";

const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  name: z.string().min(1, "Name is required"),
  domain: z.string().min(1, "Domain is required"),
  containerName: z.string().min(1, "Container name is required"),
  type: z.enum(["frontend", "backend"]),
  billingName: z.string().optional(),
  billingEmail: z.string().email().optional().or(z.literal("")),
  billingAddress: z.string().optional(),
  amountDue: z.coerce.number().nonnegative().optional(),
  dueDate: z.string().optional(),
  gracePeriodDays: z.coerce.number().int().nonnegative(),
  customerId: z.string().optional(),
  newCustomerName: z.string().optional(),
  newCustomerEmail: z.string().email().optional().or(z.literal("")),
  newCustomerPhone: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
}

export function ProjectFormDialog({ open, onOpenChange, project }: ProjectFormDialogProps) {
  const isEdit = !!project;
  const create = useCreateProject();
  const update = useUpdateProject(project?.slug ?? "");
  const { data: wizardContext, isLoading: wizardLoading } = useProjectWizardContext(open && !isEdit);
  const customers = useDashboardCustomers();
  const pending = create.isPending || update.isPending;
  const [billingSameAsCustomer, setBillingSameAsCustomer] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      type: "frontend",
      gracePeriodDays: 3,
    },
  });

  const type = watch("type");
  const containerName = watch("containerName");
  const customerId = watch("customerId");
  const selectedCustomer = customers.data?.find(customer => customer.id === customerId);

  useEffect(() => {
    if (open && project) {
      reset({
        slug: project.slug,
        name: project.name,
        domain: project.domain,
        containerName: project.containerName,
        type: project.type,
        amountDue: project.amountDue,
        dueDate: project.dueDate?.slice(0, 10) ?? "",
        gracePeriodDays: project.gracePeriodDays,
        billingName: project.billingName ?? "", billingEmail: project.billingEmail ?? "", billingAddress: project.billingAddress ?? "",
        customerId: project.customerId ?? "",
        newCustomerName: "",
        newCustomerEmail: "",
        newCustomerPhone: "",
      });
    } else if (open && !project) {
      reset({
        slug: "",
        name: "",
        domain: "",
        containerName: "",
        type: "frontend",
        amountDue: undefined,
        dueDate: "",
        gracePeriodDays: 3,
        billingName: "", billingEmail: "", billingAddress: "",
        customerId: "",
        newCustomerName: "",
        newCustomerEmail: "",
        newCustomerPhone: "",
      });
    }
  }, [open, project, reset]);

  const handleContainerSelect = (containerName: string) => {
    setValue("containerName", containerName, { shouldValidate: true });

    // Auto-suggest slug if creating new and slug is empty
    if (!isEdit) {
      const currentSlug = getValues("slug");
      if (!currentSlug) {
        const container = wizardContext?.containers.find((c) => c.name === containerName);
        if (container?.suggestedSlug) {
          setValue("slug", container.suggestedSlug, { shouldValidate: true });
        }
      }
    }
  };

  const onSubmit = (values: ProjectFormValues) => {
    const customerIdentity = customerId === "__new__"
      ? { name: values.newCustomerName?.trim() || undefined, email: values.newCustomerEmail || undefined }
      : { name: selectedCustomer?.name, email: selectedCustomer?.contactEmail ?? undefined };
    const normalized = {
      name: values.name,
      domain: values.domain,
      containerName: values.containerName,
      type: values.type,
      billingName: billingSameAsCustomer ? customerIdentity.name : values.billingName || undefined,
      billingEmail: billingSameAsCustomer ? customerIdentity.email : values.billingEmail || undefined,
      billingAddress: billingSameAsCustomer ? undefined : values.billingAddress || undefined,
      amountDue: values.amountDue,
      dueDate: values.dueDate || undefined,
      gracePeriodDays: values.gracePeriodDays,
      ...(values.customerId === "__new__" ? { newCustomer: { name: values.newCustomerName?.trim() ?? "", contactEmail: values.newCustomerEmail || undefined, contactPhone: values.newCustomerPhone || undefined } } : { customerId: values.customerId || undefined }),
    };
    if (isEdit) {
      const changedEntries = Object.entries(normalized).filter(([key, value]) => {
        const original = project?.[key as keyof Project];
        const comparableOriginal = key === "dueDate" && typeof original === "string" ? original.slice(0, 10) : original;
        return value !== comparableOriginal;
      });
      const payload: UpdateProjectPayload = Object.fromEntries(changedEntries);
      update.mutate(payload, {
        onSuccess: () => {
          toast.success("Project updated");
          onOpenChange(false);
        },
        onError: handleSubmitError,
      });
      return;
    }

    const payload: CreateProjectPayload = { ...values, ...normalized };
    create.mutate(payload, {
      onSuccess: () => {
        toast.success("Project created");
        onOpenChange(false);
      },
      onError: handleSubmitError,
    });
  };

  const selectedContainer = wizardContext?.containers.find(
    (c) => c.name === containerName || c.name === containerName?.split(":")[0],
  );

  function handleSubmitError(err: unknown) {
    const code = getApiErrorCode(err)?.toLowerCase() ?? "";
    const message = getApiErrorMessage(err);
    const text = message.toLowerCase();
    const field: keyof ProjectFormValues | null = code.includes("slug") || text.includes("slug") ? "slug"
      : code.includes("domain") || text.includes("domain") ? "domain"
        : code.includes("container") || text.includes("container") ? "containerName"
          : code.includes("email") || text.includes("email") ? "newCustomerEmail" : null;

    if (field) {
      setError(field, { type: "server", message });
      setFocus(field);
      toast.error(message);
      return;
    }

    toast.error(code === "container_not_found"
      ? "The referenced Docker container doesn't exist. Create the container first, then register the project."
      : message);
  }

  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader className="border-b px-6 py-5 pr-14">
          <SidePanelTitle className="text-base">{isEdit ? "Edit project" : "New project"}</SidePanelTitle>
          <SidePanelDescription className="text-xs">
            {isEdit
              ? "Update project details."
              : "Register a new client project in Gatekeeper. The container must already exist."}
          </SidePanelDescription>
        </SidePanelHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-6 text-sm [&_label]:text-xs [&_input]:h-8">
          {/* Container selection: container-first flow */}
          <div className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="text-sm font-semibold">Container setup</h3>
              <p className="text-xs text-muted-foreground">Bind this project to an existing Docker container.</p>
            </div>
            <div className="space-y-2">
            <Label htmlFor="containerName">Container *</Label>
            {isEdit ? (
              <Input id="containerName" {...register("containerName")} />
            ) : wizardLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <>
                <select
                  id="containerName"
                  value={containerName ?? ""}
                  onChange={(e) => handleContainerSelect(e.target.value)}
                    className="h-8 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  <option value="">-- Select a container --</option>
                  {wizardContext?.containers.filter((c) => !wizardContext.existingProjectSlugs.includes(c.suggestedSlug)).map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.image})
                    </option>
                  ))}
                  {wizardContext?.containers.some((c) => wizardContext.existingProjectSlugs.includes(c.suggestedSlug)) && (
                    <optgroup label="Already linked">
                      {wizardContext.containers.filter((c) => wizardContext.existingProjectSlugs.includes(c.suggestedSlug)).map((c) => (
                        <option key={c.id} value={c.name} disabled>
                          {c.name} ({c.image}) (already linked)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {wizardContext?.containers.every((c) => wizardContext.existingProjectSlugs.includes(c.suggestedSlug)) && (
                  <p className="text-xs text-amber-600">
                    All available containers are already linked. Create another container before registering a new project.
                  </p>
                )}
                {selectedContainer && (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className={
                        selectedContainer.state === "running"
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                          : "bg-red-500/15 text-red-600 border-red-500/20"
                      }
                    >
                      {selectedContainer.state}
                    </Badge>
                    <span className="text-muted-foreground font-mono">{selectedContainer.ports}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Format: <code>name</code> or <code>name:port</code>. Only existing containers are listed.
                </p>
              </>
            )}
            {errors.containerName && (
              <p className="text-sm text-destructive">{errors.containerName.message}</p>
            )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-b pb-2"><h3 className="text-sm font-semibold">3. Customer</h3><p className="text-xs text-muted-foreground">{isEdit ? "Link this project to its customer." : "Optionally assign ownership while creating the project."}</p></div>
            <Select value={customerId || ""} onValueChange={(value) => setValue("customerId", value, { shouldValidate: true })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select an existing customer" /></SelectTrigger>
              <SelectContent>
                {customers.isLoading ? <SelectItem value="__loading" disabled>Loading customers…</SelectItem> : customers.data?.length ? customers.data.map(customer => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>) : <SelectItem value="__empty" disabled>No customers available</SelectItem>}
                <SelectItem value="__new__">Create a new customer</SelectItem>
              </SelectContent>
            </Select>
            {customerId === "__new__" && <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Customer name" {...register("newCustomerName")} /><Input type="email" placeholder="Customer email (optional)" {...register("newCustomerEmail")} /><Input placeholder="Customer phone (optional)" {...register("newCustomerPhone")} /></div>}
          </div>

          <div className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="text-sm font-semibold">1. Project details</h3>
              <p className="text-xs text-muted-foreground">Identify the application and how it is served.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" disabled={isEdit} {...register("slug")} />
              {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input id="domain" {...register("domain")} />
              {errors.domain && <p className="text-sm text-destructive">{errors.domain.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setValue("type", v as "frontend" | "backend")}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frontend">Frontend</SelectItem>
                  <SelectItem value="backend">Backend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="text-sm font-semibold">2. Customer & billing</h3>
              <p className="text-xs text-muted-foreground">Payment policy details for the selected customer.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gracePeriodDays">Grace period (days)</Label>
              <Input id="gracePeriodDays" type="number" {...register("gracePeriodDays")} />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2"><input id="billing-same" type="checkbox" checked={billingSameAsCustomer} onChange={(event) => { const checked = event.target.checked; setBillingSameAsCustomer(checked); if (checked) { setValue("billingName", customerId === "__new__" ? getValues("newCustomerName") || "" : selectedCustomer?.name || ""); setValue("billingEmail", customerId === "__new__" ? getValues("newCustomerEmail") || "" : selectedCustomer?.contactEmail || ""); } }} /><Label htmlFor="billing-same">Billing information same as customer</Label></div>
            {billingSameAsCustomer && <p className="text-xs text-muted-foreground">Billing fields are taken from the selected customer.</p>}
            {!billingSameAsCustomer && <><div className="space-y-2"><Label htmlFor="billingName">Billing name</Label><Input id="billingName" {...register("billingName")} /></div><div className="space-y-2"><Label htmlFor="billingEmail">Billing email</Label><Input id="billingEmail" type="email" {...register("billingEmail")} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="billingAddress">Billing address</Label><Input id="billingAddress" {...register("billingAddress")} /></div></>}
            <div className="space-y-2">
              <Label htmlFor="amountDue">Amount due</Label>
              <Input id="amountDue" type="number" step="0.01" {...register("amountDue")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
            </div>
            </div>
          </div>
          <SidePanelFooter className="sticky bottom-0 -mx-6 -mb-6 mt-2 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
            </Button>
          </SidePanelFooter>
        </form>
      </SidePanelContent>
    </SidePanel>
  );
}
