import { useRef, useState } from "react";
import { FileUp, Plus, X, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useContainerWizardContext,
  useCreateContainer,
  useValidateCreateContainer,
} from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/api";
import type {
  ContainerValidateResponse,
  CreateContainerPayload,
  VolumeMount,
} from "@/types/container";

interface CreateContainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PortMapping {
  host: string;
  container: string;
}

interface EnvVar {
  key: string;
  value: string;
}

type WizardStep = 0 | 1 | 2 | 3;

const STEP_LABELS = ["Basics", "Network & Ports", "Env & Volumes", "Review"];

function parseEnvFile(content: string): EnvVar[] {
  const vars: EnvVar[] = [];
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const cleaned = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eqIndex = cleaned.indexOf("=");
    if (eqIndex === -1) continue;

    const key = cleaned.slice(0, eqIndex).trim();
    let value = cleaned.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) {
      vars.push({ key, value });
    }
  }

  return vars;
}

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

export function CreateContainerDialog({ open, onOpenChange }: CreateContainerDialogProps) {
  const createContainer = useCreateContainer();
  const validateContainer = useValidateCreateContainer();
  const { data: wizardContext, isLoading: wizardContextLoading } = useContainerWizardContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [wizardStep, setWizardStep] = useState<WizardStep>(0);
  const [validation, setValidation] = useState<ContainerValidateResponse | null>(null);

  const [name, setName] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  const [image, setImage] = useState("");
  const [network, setNetwork] = useState(wizardContext?.internalNetwork || "bridge");
  const [restartPolicy, setRestartPolicy] = useState("unless-stopped");
  const [pullImage, setPullImage] = useState(true);
  const [pullViaCli, setPullViaCli] = useState(false);
  const [ports, setPorts] = useState<PortMapping[]>([{ host: "", container: "" }]);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [volumes, setVolumes] = useState<VolumeMount[]>([]);
  const [envFile, setEnvFile] = useState<File | null>(null);
  const [imageNotLocal, setImageNotLocal] = useState(false);
  const [checkingWizard, setCheckingWizard] = useState(false);

  const resetForm = () => {
    setName("");
    setProjectSlug("");
    setImage("");
    setNetwork(wizardContext?.internalNetwork || "bridge");
    setRestartPolicy("unless-stopped");
    setPullImage(true);
    setPullViaCli(false);
    setPorts([{ host: "", container: "" }]);
    setEnvVars([]);
    setVolumes([]);
    setEnvFile(null);
    setImageNotLocal(false);
    setValidation(null);
    setWizardStep(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const buildPayload = (): CreateContainerPayload => {
    const portMap: Record<string, number> = {};
    for (const p of ports) {
      if (p.host && p.container) {
        const hostPort = parseInt(p.host, 10);
        const containerPort = parseInt(p.container, 10);
        if (!Number.isNaN(hostPort) && !Number.isNaN(containerPort)) {
          portMap[String(hostPort)] = containerPort;
        }
      }
    }

    const envMap: Record<string, string> = {};
    for (const env of envVars) {
      if (env.key && env.value) {
        envMap[env.key] = env.value;
      }
    }

    return {
      name: name || undefined,
      projectSlug: projectSlug || undefined,
      image,
      ports: Object.keys(portMap).length > 0 ? portMap : undefined,
      env: Object.keys(envMap).length > 0 ? envMap : undefined,
      network,
      volumes: volumes.filter((v) => v.hostPath && v.containerPath),
      restartPolicy: restartPolicy as "no" | "always" | "unless-stopped" | "on-failure",
      pullImage,
      pullViaCli,
    };
  };

  const handleImageBlur = async () => {
    if (!image) return;
    try {
      setCheckingWizard(true);
      const res = await validateContainer.mutateAsync({
        name,
        image,
        network,
        restartPolicy: restartPolicy as "no" | "always" | "unless-stopped" | "on-failure",
        pullImage,
      });
      setImageNotLocal(!res.data.imageExists);
    } catch {
      setImageNotLocal(false);
    } finally {
      setCheckingWizard(false);
    }
  };

  const handleEnvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".env") && !fileName.includes(".env.") && file.type !== "text/plain") {
      toast.error("Please select a valid .env file");
      e.target.value = "";
      return;
    }

    try {
      const content = await file.text();
      const parsed = parseEnvFile(content);

      if (parsed.length === 0) {
        toast.error("No valid environment variables found in the .env file");
        e.target.value = "";
        return;
      }

      setEnvVars((existing) => {
        const merged = [...existing];
        const seen = new Set(merged.map((v) => v.key));

        for (const v of parsed) {
          if (seen.has(v.key)) {
            const idx = merged.findIndex((m) => m.key === v.key);
            if (idx !== -1) merged[idx] = v;
          } else {
            merged.push(v);
            seen.add(v.key);
          }
        }
        return merged;
      });

      setEnvFile(file);
      toast.success(`Loaded ${parsed.length} variable${parsed.length === 1 ? "" : "s"} from ${file.name}`);
    } catch {
      toast.error("Failed to read the .env file");
      e.target.value = "";
    }
  };

  const handleNext = async () => {
    if (wizardStep === 0) {
      if (!image) {
        toast.error("Image is required");
        return;
      }
      if (!name && !projectSlug) {
        toast.error("Either a container name or project slug is required");
        return;
      }
      setWizardStep(1);
      return;
    }

    if (wizardStep === 1) {
      // Validate on the way to review so the review step has data
      setWizardStep(2);
      return;
    }

    if (wizardStep === 2) {
      setCheckingWizard(true);
      try {
        const payload = buildPayload();
        const res = await validateContainer.mutateAsync(payload);
        setValidation(res.data);

        if (res.data.portConflicts.length > 0) {
          toast.error(`Port conflicts detected: ${res.data.portConflicts.join(", ")}`);
          setWizardStep(1);
          return;
        }
        setWizardStep(3);
        if (res.data.warnings.length > 0) {
          toast.warning("Warnings found — review before creating");
        } else {
          toast.success("Configuration validated — review below");
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err));
      } finally {
        setCheckingWizard(false);
      }
    }
  };

  const handleCreate = async () => {
    if (!image) {
      toast.error("Image is required");
      return;
    }
    if (!name && !projectSlug) {
      toast.error("Either a container name or project slug is required");
      return;
    }

    try {
      setCheckingWizard(true);
      const payload = buildPayload();
      await createContainer.mutateAsync(payload);
      toast.success(`Container ${name || projectSlug} created`);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setCheckingWizard(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Container — Wizard</DialogTitle>
          <DialogDescription>
            Configure and create a Docker container, step by step.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator current={wizardStep} />
        <Separator />

        <div className="space-y-6">
          {/* Step 1: Basics */}
          {wizardStep === 0 && (
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold tracking-wide">Basics</h3>
                <p className="text-xs text-muted-foreground">Name, image, and restart behavior.</p>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-app (optional with project slug)" />
                  <p className="text-xs text-muted-foreground">
                    Optional if a project slug is provided — Gatekeeper will auto-name using the slug.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectSlug">Project Slug</Label>
                  <Input
                    id="projectSlug"
                    value={projectSlug}
                    onChange={(e) => setProjectSlug(e.target.value)}
                    placeholder="my-app (optional)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Links this container to a project. If name is blank, the container is auto-named from this slug.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Image *</Label>
                  <Input
                    id="image"
                    value={image}
                    onChange={(e) => {
                      setImage(e.target.value);
                      setImageNotLocal(false);
                    }}
                    onBlur={handleImageBlur}
                    placeholder="nginx:latest"
                  />
                  {imageNotLocal && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Image not found locally — it will be pulled from the registry when pull is enabled.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="restartPolicy">Restart Policy</Label>
                  <select
                    id="restartPolicy"
                    value={restartPolicy}
                    onChange={(e) => setRestartPolicy(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="no">no</option>
                    <option value="always">always</option>
                    <option value="unless-stopped">unless-stopped</option>
                    <option value="on-failure">on-failure</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={pullImage}
                      onChange={(e) => setPullImage(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    Pull image before creating
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={pullViaCli}
                      onChange={(e) => setPullViaCli(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    Pull via Docker CLI (reuse host Docker Hub auth)
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* Step 2: Network & Ports */}
          {wizardStep === 1 && (
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold tracking-wide">Network & Ports</h3>
                <p className="text-xs text-muted-foreground">Which network to join and which host ports to publish.</p>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="network">Network</Label>
                {wizardContextLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <>
                    <select
                      id="network"
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {(!wizardContext || wizardContext.networks.length === 0) && (
                        <option value="bridge">bridge</option>
                      )}
                      {wizardContext?.networks.map((n) => (
                        <option key={n} value={n}>
                          {n}
                          {wizardContext.internalNetwork === n ? " (internal)" : ""}
                        </option>
                      ))}
                    </select>
                    {wizardContext && !wizardContext.internalNetworkExists && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Internal network "{wizardContext.internalNetwork}" does not exist yet — it will be created if needed.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Port Mappings</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPorts([...ports, { host: "", container: "" }])}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Port
                  </Button>
                </div>
                {ports.map((port, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Host port (e.g. 8080)"
                      value={port.host}
                      onChange={(e) => {
                        const next = [...ports];
                        next[idx].host = e.target.value;
                        setPorts(next);
                      }}
                    />
                    <span className="text-muted-foreground">→</span>
                    <Input
                      placeholder="Container port (e.g. 80)"
                      value={port.container}
                      onChange={(e) => {
                        const next = [...ports];
                        next[idx].container = e.target.value;
                        setPorts(next);
                      }}
                    />
                    {ports.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setPorts(ports.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Step 3: Env & Volumes */}
          {wizardStep === 2 && (
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold tracking-wide">Environment & Volumes</h3>
                <p className="text-xs text-muted-foreground">Set env vars (or upload a .env file) and optional volume mounts.</p>
              </div>
              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Environment Variables</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileUp className="h-3 w-3 mr-1" />
                      Upload .env
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEnvVars([...envVars, { key: "", value: "" }])}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Env
                    </Button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".env,.env.*,text/plain"
                  className="hidden"
                  onChange={handleEnvFileChange}
                />

                {envFile && (
                  <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-2 truncate">
                      <FileUp className="h-3 w-3 shrink-0" />
                      {envFile.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => {
                        setEnvFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {envVars.map((env, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Key (e.g. DB_HOST)"
                      value={env.key}
                      onChange={(e) => {
                        const next = [...envVars];
                        next[idx].key = e.target.value;
                        setEnvVars(next);
                      }}
                    />
                    <Input
                      placeholder="Value"
                      value={env.value}
                      onChange={(e) => {
                        const next = [...envVars];
                        next[idx].value = e.target.value;
                        setEnvVars(next);
                      }}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setEnvVars(envVars.filter((_, i) => i !== idx))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Volume Mounts</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setVolumes([...volumes, { hostPath: "", containerPath: "", readOnly: false }])}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Volume
                  </Button>
                </div>
                {volumes.map((vol, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Host path (e.g. /data/app)"
                      value={vol.hostPath}
                      onChange={(e) => {
                        const next = [...volumes];
                        next[idx].hostPath = e.target.value;
                        setVolumes(next);
                      }}
                    />
                    <span className="text-muted-foreground">→</span>
                    <Input
                      placeholder="Container path (e.g. /app/data)"
                      value={vol.containerPath}
                      onChange={(e) => {
                        const next = [...volumes];
                        next[idx].containerPath = e.target.value;
                        setVolumes(next);
                      }}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setVolumes(volumes.filter((_, i) => i !== idx))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Step 4: Review */}
          {wizardStep === 3 && (
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold tracking-wide">Review & Confirm</h3>
                <p className="text-xs text-muted-foreground">
                  Validated by Gatekeeper — no changes were applied yet.
                </p>
              </div>
              <Separator />

              {validateContainer.isPending ? (
                <Skeleton className="h-64 w-full" />
              ) : validation ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoRow label="Name" value={validation.normalizedRequest.name ?? ""} />
                    <InfoRow label="Image" value={validation.normalizedRequest.image} mono />
                    <InfoRow label="Network" value={validation.normalizedRequest.network ?? ""} />
                    <InfoRow label="Restart Policy" value={validation.normalizedRequest.restartPolicy ?? ""} />
                  </div>

                  {validation.normalizedRequest.ports &&
                    Object.keys(validation.normalizedRequest.ports).length > 0 && (
                      <InfoRow
                        label="Port Mappings"
                        value={Object.entries(validation.normalizedRequest.ports)
                          .map(([h, c]) => `${h} → ${c}`)
                          .join(", ")}
                      />
                    )}

                  {validation.normalizedRequest.env &&
                    Object.keys(validation.normalizedRequest.env).length > 0 && (
                      <InfoRow
                        label="Environment"
                        value={Object.entries(validation.normalizedRequest.env)
                          .map(([k]) => k)
                          .join(", ")}
                      />
                    )}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={validation.imageExists ? "default" : "secondary"}>
                      {validation.imageExists ? "Image available" : validation.willPullImage ? "Will pull image" : "Image missing"}
                    </Badge>
                    <Badge variant={validation.networkExists ? "default" : "secondary"}>
                      {validation.networkExists
                        ? `Network "${validation.normalizedRequest.network}" exists`
                        : validation.willCreateInternalNetworkIfMissing
                          ? "Will create internal network"
                          : "Network missing"}
                    </Badge>
                    {validation.portConflicts.length === 0 ? (
                      <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
                        No port conflicts
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        Port conflicts: {validation.portConflicts.join(", ")}
                      </Badge>
                    )}
                  </div>

                  {validation.warnings.length > 0 && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Warnings
                      </p>
                      <ul className="mt-1 list-disc list-inside text-xs text-amber-700 space-y-0.5">
                        {validation.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>Couldn't generate a preview. Review the details below before confirming.</p>
                </div>
              )}
            </section>
          )}
        </div>

        <DialogFooter>
          {wizardStep > 0 ? (
            <Button type="button" variant="outline" onClick={() => setWizardStep((wizardStep - 1) as WizardStep)}>
              Back
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {wizardStep < 3 ? (
            <Button type="button" onClick={handleNext} disabled={checkingWizard}>
              {checkingWizard ? "Checking..." : "Next"}
            </Button>
          ) : (
            <Button type="button" onClick={handleCreate} disabled={createContainer.isPending || checkingWizard}>
              {createContainer.isPending ? "Creating..." : "Confirm & Create"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}