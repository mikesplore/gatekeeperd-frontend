import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateProject, useUpdateProject } from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/api";
import type { Project } from "@/types/project";

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
  const pending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      type: "frontend",
      gracePeriodDays: 3,
    },
  });

  const type = watch("type");

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

  const onSubmit = (values: ProjectFormValues) => {
    const payload = {
      ...values,
      clientName: values.clientName || undefined,
      clientEmail: values.clientEmail || undefined,
      dueDate: values.dueDate || undefined,
    };

    const mutation = isEdit ? update : create;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isEdit ? "Project updated" : "Project created");
        onOpenChange(false);
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update project details." : "Register a new client project in Gatekeeper."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Label htmlFor="containerName">Container name</Label>
              <Input id="containerName" {...register("containerName")} />
              {errors.containerName && (
                <p className="text-sm text-destructive">{errors.containerName.message}</p>
              )}
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
