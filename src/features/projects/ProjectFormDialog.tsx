import { useEffect } from "react";
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
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import type { CreateProjectPayload, Project, UpdateProjectPayload } from "@/types/project";

const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  name: z.string().min(1, "Name is required"),
  domain: z.string().min(1, "Domain is required"),
  containerName: z.string().min(1, "Container name is required"),
  type: z.enum(["frontend", "backend"]),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  amountDue: z.coerce.number().nonnegative().optional(),
  dueDate: z.string().optional(),
  gracePeriodDays: z.coerce.number().int().nonnegative(),
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
  const { data: wizardContext, isLoading: wizardLoading } = useProjectWizardContext();
  const pending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
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

  useEffect(() => {
    if (open && project) {
      reset({
        slug: project.slug,
        name: project.name,
        domain: project.domain,
        containerName: project.containerName,
        type: project.type,
        clientName: project.clientName ?? "",
        clientEmail: project.clientEmail ?? "",
        amountDue: project.amountDue,
        dueDate: project.dueDate?.slice(0, 10) ?? "",
        gracePeriodDays: project.gracePeriodDays,
      });
    } else if (open && !project) {
      reset({
        slug: "",
        name: "",
        domain: "",
        containerName: "",
        type: "frontend",
        clientName: "",
        clientEmail: "",
        amountDue: undefined,
        dueDate: "",
        gracePeriodDays: 3,
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
    const normalized = {
      name: values.name,
      domain: values.domain,
      containerName: values.containerName,
      type: values.type,
      clientName: values.clientName || undefined,
      clientEmail: values.clientEmail || undefined,
      amountDue: values.amountDue,
      dueDate: values.dueDate || undefined,
      gracePeriodDays: values.gracePeriodDays,
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
        onError: (err) => {
          const code = getApiErrorCode(err);
          toast.error(code === "container_not_found" ? "The referenced Docker container doesn't exist. Create the container first, then register the project." : getApiErrorMessage(err));
        },
      });
      return;
    }

    const payload: CreateProjectPayload = { ...values, ...normalized };
    create.mutate(payload, {
      onSuccess: () => {
        toast.success("Project created");
        onOpenChange(false);
      },
      onError: (err) => {
        const code = getApiErrorCode(err);
        if (code === "container_not_found") {
          toast.error("The referenced Docker container doesn't exist. Create the container first, then register the project.");
        } else {
          toast.error(getApiErrorMessage(err));
        }
      },
    });
  };

  const selectedContainer = wizardContext?.containers.find(
    (c) => c.name === containerName || c.name === containerName?.split(":")[0],
  );

  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader className="border-b px-6 py-5 pr-14">
          <SidePanelTitle>{isEdit ? "Edit project" : "New project"}</SidePanelTitle>
          <SidePanelDescription>
            {isEdit
              ? "Update project details."
              : "Register a new client project in Gatekeeper. The container must already exist."}
          </SidePanelDescription>
        </SidePanelHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-6">
          {/* Container selection — container-first flow */}
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
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Select a container --</option>
                  {wizardContext?.containers.map((c) => {
                    const alreadyUsed = wizardContext.existingProjectSlugs.includes(c.suggestedSlug);
                    return (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.image}){alreadyUsed ? " — already linked" : ""}
                      </option>
                    );
                  })}
                </select>
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
                <SelectTrigger>
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
              <h3 className="text-sm font-semibold">2. Client & billing</h3>
              <p className="text-xs text-muted-foreground">Optional client contact and payment policy details.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gracePeriodDays">Grace period (days)</Label>
              <Input id="gracePeriodDays" type="number" {...register("gracePeriodDays")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientName">Client name</Label>
              <Input id="clientName" {...register("clientName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client email</Label>
              <Input id="clientEmail" type="email" {...register("clientEmail")} />
              {errors.clientEmail && (
                <p className="text-sm text-destructive">{errors.clientEmail.message}</p>
              )}
            </div>
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
