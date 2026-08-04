import { useState } from "react";
import { Server, Shield, Trash2, ToggleLeft, Plus, CircleHelp, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryState } from "@/components/QueryState";
import {
  useNginxStatus,
  useNginxWizardContext,
  useValidateNginxEnable,
  useEnableNginx,
  useDisableNginx,
  useRemoveNginx,
  useInstallCertificate,
  useCertificateStatus,
} from "@/hooks/useNginx";
import { useProjects } from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import type { EnableNginxPayload } from "@/types/nginx";

interface EnableFormData {
  port?: number;
  upstreamScheme?: "http" | "https";
  certificateDomain?: string;
  sslCertificatePath?: string;
  sslCertificateKeyPath?: string;
  requireSsl?: boolean;
}

interface CertificateFormData {
  domain: string;
  email: string;
}

type WizardStep = 0 | 1 | 2 | 3;

const STEP_LABELS = ["Overview", "Upstream", "SSL", "Review"];

function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {STEP_LABELS.map((label, idx) => {
        const step = idx as WizardStep;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                isDone
                  ? "bg-emerald-500 text-white"
                  : isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isDone ? <Check className="h-3 w-3" /> : idx + 1}
            </div>
            <span
              className={`text-xs ${isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            {step < 3 && <div className="h-px w-6 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm break-all ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</p>
    </div>
  );
}

export function NginxPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [wizardStep, setWizardStep] = useState<WizardStep>(0);
  const [previewConfig, setPreviewConfig] = useState<string | null>(null);
  const selectedProjectData = projects?.find((p) => p.slug === selectedSlug);
  const selectedDomain = selectedProjectData?.domain ?? "";

  const { data: nginxStatus, isLoading: statusLoading, refetch: refetchStatus } = useNginxStatus(selectedSlug);
  const { data: wizardContext, refetch: refetchWizardContext } = useNginxWizardContext(selectedSlug);
  const validateEnable = useValidateNginxEnable(selectedSlug);
  const enableNginx = useEnableNginx();
  const disableNginx = useDisableNginx();
  const removeNginx = useRemoveNginx();
  const installCertificate = useInstallCertificate();

  const { data: certStatus, refetch: refetchCertStatus } = useCertificateStatus(selectedDomain);

  const {
    register: registerEnable,
    handleSubmit: handleSubmitEnable,
    reset: resetEnable,
  } = useForm<EnableFormData>({
    defaultValues: {
      port: wizardContext?.configuredPort ?? undefined,
    },
  });

  const {
    register: registerCert,
    handleSubmit: handleSubmitCert,
    reset: resetCert,
  } = useForm<CertificateFormData>();

  const openEnableDialog = () => {
    setWizardStep(0);
    setPreviewConfig(null);
    resetEnable({
      port: wizardContext?.configuredPort ?? undefined,
    });
    setEnableDialogOpen(true);
  };

  const handleEnable = async (data: EnableFormData) => {
    if (!selectedSlug) return;
    const payload: EnableNginxPayload = {
      port: data.port,
      upstreamScheme: data.upstreamScheme,
      certificateDomain: data.certificateDomain || undefined,
      sslCertificatePath: data.sslCertificatePath || undefined,
      sslCertificateKeyPath: data.sslCertificateKeyPath || undefined,
      requireSsl: data.requireSsl,
    };
    try {
      await enableNginx.mutateAsync({ slug: selectedSlug, payload });
      toast.success("Nginx site enabled and reloaded");
      setEnableDialogOpen(false);
      resetEnable();
      refetchStatus();
      refetchWizardContext();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleValidatePreview = async (data: EnableFormData) => {
    if (!selectedSlug) return;
    const payload: EnableNginxPayload = {
      port: data.port,
      upstreamScheme: data.upstreamScheme,
      certificateDomain: data.certificateDomain || undefined,
      sslCertificatePath: data.sslCertificatePath || undefined,
      sslCertificateKeyPath: data.sslCertificateKeyPath || undefined,
      requireSsl: data.requireSsl,
    };
    try {
      const res = await validateEnable.mutateAsync(payload);
      setPreviewConfig(res.data.config);
      if (res.data.sslEnabled) {
        toast.success("Configuration validated — SSL enabled");
      } else {
        toast.success("Configuration validated");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleDisable = async () => {
    if (!selectedSlug || !confirm("Are you sure you want to disable this nginx site?")) return;
    try {
      await disableNginx.mutateAsync(selectedSlug);
      refetchStatus();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleRemove = async () => {
    if (!selectedSlug || !confirm("Are you sure you want to remove this nginx site configuration? This cannot be undone.")) return;
    try {
      await removeNginx.mutateAsync(selectedSlug);
      refetchStatus();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleInstallCertificate = async (data: CertificateFormData) => {
    if (!selectedProject) return;
    try {
      await installCertificate.mutateAsync({ domain: data.domain, email: data.email });
      setCertificateDialogOpen(false);
      resetCert();
      refetchStatus();
      refetchCertStatus();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nginx Management</h1>
        <p className="text-muted-foreground">Manage nginx site configurations and SSL certificates for client projects.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <select
              value={selectedSlug}
              onChange={(e) => {
                setSelectedSlug(e.target.value);
                const project = projects?.find((p) => p.slug === e.target.value);
                setSelectedProject(project?.domain ?? "");
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">-- Select a project --</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.slug}>
                  {project.name} ({project.slug})
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      {selectedSlug && (
        <QueryState
          isLoading={statusLoading}
          isError={false}
          error={null}
          data={nginxStatus}
          loadingFallback={
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          }
        >
          {() => nginxStatus && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Nginx Status
                    </CardTitle>
                    <Badge variant={nginxStatus.enabled ? "default" : "secondary"}>
                      {nginxStatus.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoRow label="Domain" value={nginxStatus.domain} />
                    <InfoRow label="App Port" value={nginxStatus.port ? String(nginxStatus.port) : ""} />
                    <InfoRow label="Config Path" value={nginxStatus.configPath} mono />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SSL Enabled</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {nginxStatus.sslEnabled ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </div>
                    </div>
                    {nginxStatus.certificateDomain && (
                      <InfoRow label="Certificate Domain" value={nginxStatus.certificateDomain} />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t mt-4">
                    {!nginxStatus.enabled ? (
                      <Button onClick={openEnableDialog} size="sm">
                        <ToggleLeft className="h-4 w-4 mr-2" />
                        Enable Site
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" onClick={handleDisable} size="sm">
                          Disable
                        </Button>
                        <Button variant="destructive" onClick={handleRemove} size="sm">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {nginxStatus.sslEnabled && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      SSL Certificate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {certStatus ? (
                      <div className="space-y-3">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
                            <Badge variant={certStatus.installed ? "default" : "secondary"}>
                              {certStatus.installed ? "Installed" : "Not Installed"}
                            </Badge>
                          </div>
                          {certStatus.installed && (
                            <>
                              <InfoRow label="Certificate Path" value={certStatus.certificatePath} mono />
                              <InfoRow label="Private Key Path" value={certStatus.privateKeyPath} mono />
                            </>
                          )}
                        </div>
                        {!certStatus.installed && (
                          <Button onClick={() => setCertificateDialogOpen(true)} size="sm" className="mt-4">
                            <Plus className="h-4 w-4 mr-2" />
                            Install Certificate
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Skeleton className="h-20 w-full" />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </QueryState>
      )}

      <Dialog open={enableDialogOpen} onOpenChange={setEnableDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enable Nginx Site — Wizard</DialogTitle>
            <DialogDescription>
              Configure nginx to serve this project, step by step.
            </DialogDescription>
          </DialogHeader>

          <StepIndicator current={wizardStep} />
          <Separator />

          <form
            onSubmit={handleSubmitEnable((data) => {
              if (wizardStep === 0) {
                setWizardStep(1);
              } else if (wizardStep === 1) {
                setWizardStep(2);
              } else if (wizardStep === 2) {
                // Validate to get preview before showing review step
                handleValidatePreview(data).then(() => setWizardStep(3));
              } else {
                handleEnable(data);
              }
            })}
            className="space-y-6"
          >
            <TooltipProvider delayDuration={200}>
              {/* Step 1: Overview */}
              {wizardStep === 0 && (
                <section className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wide">Project Overview</h3>
                    <p className="text-xs text-muted-foreground">
                      Confirm the details Gatekeeper detected for this project.
                    </p>
                  </div>
                  <Separator />
                  {wizardContext ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoRow label="Domain" value={wizardContext.domain} />
                      <InfoRow label="Container" value={wizardContext.containerName ?? wizardContext.configuredContainerName ?? ""} mono />
                      <InfoRow label="Detected Port" value={wizardContext.configuredPort ? String(wizardContext.configuredPort) : ""} />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Docker Container</p>
                        <Badge
                          variant="outline"
                          className={
                            wizardContext.dockerContainerHealth === "running"
                              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                              : wizardContext.dockerContainerHealth === "exited"
                                ? "bg-red-500/15 text-red-600 border-red-500/20"
                                : "bg-muted text-muted-foreground"
                          }
                        >
                          {wizardContext.dockerContainerHealth || "unknown"}
                        </Badge>
                      </div>
                      {wizardContext.dockerPublishedHostPorts.length > 0 && (
                        <InfoRow label="Published Host Ports" value={wizardContext.dockerPublishedHostPorts.join(", ")} />
                      )}
                      {wizardContext.resolvedCertificateDomain && (
                        <InfoRow label="Resolved Certificate" value={wizardContext.resolvedCertificateDomain} />
                      )}
                    </div>
                  ) : (
                    <Skeleton className="h-32 w-full" />
                  )}
                </section>
              )}

              {/* Step 2: Upstream */}
              {wizardStep === 1 && (
                <section className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wide">Upstream</h3>
                    <p className="text-xs text-muted-foreground">
                      How nginx reaches the application behind this site.
                    </p>
                  </div>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="port">App Port</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <CircleHelp className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            The port your application listens on. Nginx will proxy requests to this port. Optional if the port is encoded in the container name (e.g. myapp:9921).
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input id="port" type="number" {...registerEnable("port", { valueAsNumber: true })} placeholder="e.g. 3000" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="upstreamScheme">Upstream Scheme</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <CircleHelp className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Protocol the app listens on. Inferred as https for port 443, http otherwise.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <select
                        id="upstreamScheme"
                        {...registerEnable("upstreamScheme")}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Auto-detect</option>
                        <option value="http">http</option>
                        <option value="https">https</option>
                      </select>
                    </div>
                  </div>
                </section>
              )}

              {/* Step 3: SSL */}
              {wizardStep === 2 && (
                <section className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wide">SSL Certificate</h3>
                    <p className="text-xs text-muted-foreground">
                      Certificate selection is optional — Gatekeeper reuses an installed certificate for the domain when possible.
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="certificateDomain">Certificate Domain</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <CircleHelp className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Select an installed certificate. Leave blank to auto-reuse one for the project's domain or parent domains.
                        </TooltipContent>
                      </Tooltip>
                      {wizardContext?.resolvedCertificateDomain && (
                        <span className="text-xs text-emerald-600">
                          Will auto-use {wizardContext.resolvedCertificateDomain}
                        </span>
                      )}
                    </div>
                    {wizardContext && wizardContext.installedCertificates.length > 0 ? (
                      <select
                        id="certificateDomain"
                        {...registerEnable("certificateDomain")}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Auto-select from project domain</option>
                        {wizardContext.installedCertificates.map((domain) => (
                          <option key={domain} value={domain}>
                            {domain}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="certificateDomain"
                        {...registerEnable("certificateDomain")}
                        placeholder="example.com"
                      />
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="sslCertificatePath">Certificate Path</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <CircleHelp className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Optional override. Only needed when selecting a certificate explicitly — requires both the certificate and key paths.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input id="sslCertificatePath" {...registerEnable("sslCertificatePath")} placeholder="/etc/letsencrypt/live/example.com/fullchain.pem" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="sslCertificateKeyPath">Private Key Path</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <CircleHelp className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Optional override. Only needed when selecting a certificate explicitly — requires both the certificate and key paths.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input id="sslCertificateKeyPath" {...registerEnable("sslCertificateKeyPath")} placeholder="/etc/letsencrypt/live/example.com/privkey.pem" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requireSsl"
                      {...registerEnable("requireSsl")}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="requireSsl">Require SSL</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <CircleHelp className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Fail if no certificate is found instead of enabling the site without SSL.</TooltipContent>
                    </Tooltip>
                  </div>
                </section>
              )}

              {/* Step 4: Review */}
              {wizardStep === 3 && (
                <section className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wide">Review & Confirm</h3>
                    <p className="text-xs text-muted-foreground">
                      The configuration below was validated by Gatekeeper — no changes were applied yet.
                    </p>
                  </div>
                  <Separator />
                  {validateEnable.isPending ? (
                    <Skeleton className="h-48 w-full" />
                  ) : previewConfig ? (
                    <pre className="max-h-72 overflow-y-auto rounded-md bg-muted p-4 text-xs font-mono whitespace-pre-wrap break-all">
                      {previewConfig}
                    </pre>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      <p>Couldn't generate a preview. Review the details below before confirming.</p>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        <li>The upstream app port must be active</li>
                        <li>Nginx config will be created in sites-available and symlinked to sites-enabled</li>
                        <li>Nginx will be tested and reloaded after applying</li>
                      </ul>
                    </div>
                  )}
                </section>
              )}
            </TooltipProvider>

            <DialogFooter>
              {wizardStep > 0 ? (
                <Button type="button" variant="outline" onClick={() => setWizardStep((wizardStep - 1) as WizardStep)}>
                  Back
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => setEnableDialogOpen(false)}>
                  Cancel
                </Button>
              )}
              {wizardStep < 3 ? (
                <Button type="submit">
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={enableNginx.isPending}>
                  {enableNginx.isPending ? "Enabling..." : "Confirm & Enable"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={certificateDialogOpen} onOpenChange={setCertificateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install SSL Certificate</DialogTitle>
            <DialogDescription>
              Install a Let's Encrypt SSL certificate for this domain using certbot.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCert(handleInstallCertificate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input id="domain" {...registerCert("domain", { required: true })} placeholder="example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...registerCert("email", { required: true })} placeholder="admin@example.com" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCertificateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={installCertificate.isPending}>
                {installCertificate.isPending ? "Installing..." : "Install"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}