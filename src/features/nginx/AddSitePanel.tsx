import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Globe2, LockKeyhole, Server } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SidePanel, SidePanelContent, SidePanelDescription, SidePanelHeader, SidePanelTitle } from "@/components/ui/side-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/useProjects";
import { useEnableNginx, useNginxWizardContext, useValidateNginxEnable } from "@/hooks/useNginx";
import { getApiErrorMessage } from "@/lib/api";
import type { EnableNginxPayload } from "@/types/nginx";

interface AddSitePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormValues {
  certificateDomain?: string;
  sslCertificatePath?: string;
  sslCertificateKeyPath?: string;
  requireSsl?: boolean;
}

const steps = ["Project", "Upstream", "Security", "Review"];

export function AddSitePanel({ open, onOpenChange }: AddSitePanelProps) {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [slug, setSlug] = useState("");
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState("");
  const context = useNginxWizardContext(slug);
  const validate = useValidateNginxEnable(slug);
  const enable = useEnableNginx();
  const { register, handleSubmit, reset, watch } = useForm<FormValues>({ defaultValues: { requireSsl: true } });
  const selectedProject = projects?.find((project) => project.slug === slug);
  const formValues = watch();

  const close = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setStep(0);
      setPreview("");
      setSlug("");
      reset({});
    }
  };

  const payloadFrom = (values: FormValues): EnableNginxPayload => ({
    certificateDomain: values.certificateDomain || undefined,
    sslCertificatePath: values.sslCertificatePath || undefined,
    sslCertificateKeyPath: values.sslCertificateKeyPath || undefined,
    requireSsl: values.requireSsl === false ? false : undefined,
  });

  const submit = async (values: FormValues) => {
    if (step === 0) {
      if (!slug) {
        toast.error("Choose a project to continue");
        return;
      }
      reset({ requireSsl: true });
      setStep(1);
      return;
    }
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    if (step === 2) {
      try {
        const result = await validate.mutateAsync(payloadFrom(values));
        setPreview(result.data.config);
        setStep(3);
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      }
      return;
    }
    try {
      await enable.mutateAsync({ slug, payload: payloadFrom(values) });
      toast.success("Site deployed and Nginx reloaded");
      close(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <SidePanel open={open} onOpenChange={close}>
      <SidePanelContent className="sm:max-w-2xl">
        <SidePanelHeader className="border-b px-6 py-5 pr-14 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Nginx sites</p>
          <SidePanelTitle className="text-xl">Add a site</SidePanelTitle>
          <SidePanelDescription>Connect a project to its upstream, review the generated server block, and deploy it.</SidePanelDescription>
        </SidePanelHeader>
        <div className="overflow-y-auto px-6 py-5">
          <div className="mb-6 grid grid-cols-4 gap-2" aria-label="Setup progress">
            {steps.map((label, index) => (
              <div key={label} className="space-y-2">
                <div className={`h-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />
                <p className={`text-xs ${index === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>{label}</p>
              </div>
            ))}
          </div>
          <form id="add-site-form" onSubmit={handleSubmit((values) => void submit(values))} className="space-y-6">
            {step === 0 && (
              <section className="space-y-4">
                <div className="flex gap-3 rounded-lg border bg-muted/30 p-4">
                  <Globe2 className="mt-0.5 h-5 w-5 text-primary" />
                  <div><h3 className="font-medium">Choose a project</h3><p className="mt-1 text-sm text-muted-foreground">The project supplies the public domain and site identity.</p></div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-project">Project</Label>
                  {projectsLoading ? <Skeleton className="h-10 w-full" /> : (
                    <select id="site-project" value={slug} onChange={(event) => setSlug(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Select a project</option>
                      {projects?.map((project) => <option key={project.id} value={project.slug}>{project.name} · {project.domain}</option>)}
                    </select>
                  )}
                </div>
                {selectedProject && <div className="rounded-lg border p-4 text-sm"><p className="font-medium">{selectedProject.name}</p><p className="mt-1 text-muted-foreground">{selectedProject.domain} <span className="px-1">·</span> {selectedProject.slug}</p></div>}
              </section>
            )}

            {step === 1 && (
              <section className="space-y-4">
                <div className="flex gap-3 rounded-lg border bg-muted/30 p-4"><Server className="mt-0.5 h-5 w-5 text-primary" /><div><h3 className="font-medium">Upstream connection</h3><p className="mt-1 text-sm text-muted-foreground">Choose where Nginx should forward requests for {selectedProject?.domain}.</p></div></div>
                {context.isLoading ? <Skeleton className="h-20 w-full" /> : context.data && <div className="rounded-md border p-4 text-sm"><p className="text-xs text-muted-foreground">Resolved upstream</p><p className="mt-1 font-medium">{context.data.resolvedUpstreamHost && context.data.configuredPort ? `${context.data.resolvedUpstreamHost}:${context.data.configuredPort}` : "No active deployment runtime found"}</p><p className="mt-1 text-xs text-muted-foreground">Nginx connects to the Docker-published host port. {context.data.runtimeHealth ? `Runtime: ${context.data.runtimeHealth}` : "Deploy or attach a running service before adding its site."}</p></div>}
                <p className="rounded-md border p-4 text-sm">The active deployment supplies its published application port. Nginx uses HTTP to reach the container.</p>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-4">
                <div className="flex gap-3 rounded-lg border bg-muted/30 p-4"><LockKeyhole className="mt-0.5 h-5 w-5 text-primary" /><div><h3 className="font-medium">TLS and certificate</h3><p className="mt-1 text-sm text-muted-foreground">Gatekeeper can reuse an installed certificate matching this domain.</p></div></div>
                <p className="rounded-md border p-4 text-sm">HTTPS is required by default. Gatekeeper will use an installed certificate matching {context.data?.domain ?? selectedProject?.domain ?? "the service domain"}.</p><details className="rounded-md border p-4"><summary className="cursor-pointer text-sm font-medium">Advanced certificate settings</summary><div className="mt-4 space-y-4">{context.data?.installedCertificates.length ? <div className="space-y-2"><Label htmlFor="site-certificate">Installed certificate</Label><select id="site-certificate" {...register("certificateDomain")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Auto-select for service domain</option>{context.data.installedCertificates.map((domain) => <option key={domain} value={domain}>{domain}</option>)}</select></div> : <div className="space-y-2"><Label htmlFor="site-certificate">Certificate domain</Label><Input id="site-certificate" placeholder="example.com" {...register("certificateDomain")} /></div>}<div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="site-cert-path">Certificate path override</Label><Input id="site-cert-path" placeholder="/etc/letsencrypt/live/domain/fullchain.pem" {...register("sslCertificatePath")} /></div><div className="space-y-2"><Label htmlFor="site-key-path">Private key path override</Label><Input id="site-key-path" placeholder="/etc/letsencrypt/live/domain/privkey.pem" {...register("sslCertificateKeyPath")} /></div></div></div></details>
              </section>
            )}

            {step === 3 && (
              <section className="space-y-4">
                <div className="flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4"><Check className="mt-0.5 h-5 w-5 text-emerald-600" /><div><h3 className="font-medium">Configuration validated</h3><p className="mt-1 text-sm text-muted-foreground">Review the server block before applying it.</p></div></div>
                <div className="grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm"><div><p className="text-xs text-muted-foreground">Project</p><p className="mt-1 font-medium">{selectedProject?.name}</p></div><div><p className="text-xs text-muted-foreground">Domain</p><p className="mt-1 font-medium">{selectedProject?.domain}</p></div><div><p className="text-xs text-muted-foreground">Upstream port</p><p className="mt-1 font-medium">{context.data?.configuredPort ?? "Not available"}</p></div><div><p className="text-xs text-muted-foreground">TLS</p><p className="mt-1 font-medium">{formValues.requireSsl ? "Required" : "Automatic"}</p></div></div>
                {validate.isPending ? <Skeleton className="h-56 w-full" /> : <pre className="max-h-[42vh] overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">{preview || "No preview available."}</pre>}
              </section>
            )}
          </form>
        </div>
        <div className="flex items-center justify-between border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => step === 0 ? close(false) : setStep(step - 1)}><ChevronLeft className="mr-2 h-4 w-4" />{step === 0 ? "Cancel" : "Back"}</Button>
          <Button type="submit" form="add-site-form" disabled={enable.isPending || validate.isPending || (step === 0 && !slug)}>{step === 3 ? enable.isPending ? "Deploying…" : "Deploy site" : step === 2 ? validate.isPending ? "Validating…" : "Review site" : <>Continue<ChevronRight className="ml-2 h-4 w-4" /></>}</Button>
        </div>
      </SidePanelContent>
    </SidePanel>
  );
}
