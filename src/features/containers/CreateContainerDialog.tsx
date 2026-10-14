import { useRef, useState } from "react";
import { FileUp, Plus, X, Check, AlertTriangle, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/ui/side-panel";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useContainerWizardContext,
  useCreateContainer,
  useValidateCreateContainer,
} from "@/hooks/useProjects";
import { useVolumes } from "@/hooks/useDockerResources";
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
type ServicePreset = "generic" | "postgres" | "redis";

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

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
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
      <p className={`text-sm break-all ${mono ? "font-mono text-xs" : ""}`}>{value || "Not set"}</p>
    </div>
  );
}

function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function encodePostgresUrl(user: string, password: string, host: string, port: number, database: string) {
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

async function copyValue(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

export function CreateContainerDialog({ open, onOpenChange }: CreateContainerDialogProps) {
  const createContainer = useCreateContainer();
  const validateContainer = useValidateCreateContainer();
  const { data: wizardContext, isLoading: wizardContextLoading } = useContainerWizardContext();
  const { data: dockerVolumes = [] } = useVolumes();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [wizardStep, setWizardStep] = useState<WizardStep>(0);
  const [validation, setValidation] = useState<ContainerValidateResponse | null>(null);

  const [name, setName] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  const [preset, setPreset] = useState<ServicePreset>("generic");
  const [image, setImage] = useState("");
  const [postgresDatabase, setPostgresDatabase] = useState("app");
  const [postgresUser, setPostgresUser] = useState("app");
  const [postgresPassword, setPostgresPassword] = useState("");
  const [postgresVolume, setPostgresVolume] = useState("postgres-data");
  const [redisPassword, setRedisPassword] = useState("");
  const [redisVolume, setRedisVolume] = useState("redis-data");
  const [showDatabasePassword, setShowDatabasePassword] = useState(false);
  const [showRedisPassword, setShowRedisPassword] = useState(false);
  const [createdDetails, setCreatedDetails] = useState<{ id: string; name: string; ports: string } | null>(null);
  const [network, setNetwork] = useState(wizardContext?.internalNetwork || "bridge");
  const [restartPolicy, setRestartPolicy] = useState("unless-stopped");
  const [pullImage, setPullImage] = useState(true);
  const [pullViaCli, setPullViaCli] = useState(false);
  const [ports, setPorts] = useState<PortMapping[]>([{ host: "", container: "" }]);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [volumes, setVolumes] = useState<VolumeMount[]>([]);
  const [envFile, setEnvFile] = useState<File | null>(null);
  const [imageNotLocal, setImageNotLocal] = useState(false);
  const [imageChecked, setImageChecked] = useState(false);
  const [checkingWizard, setCheckingWizard] = useState(false);

  const resetForm = () => {
    setName("");
    setProjectSlug("");
    setPreset("generic");
    setImage("");
    setPostgresDatabase("app");
    setPostgresUser("app");
    setPostgresPassword("");
    setPostgresVolume("postgres-data");
    setRedisPassword("");
    setRedisVolume("redis-data");
    setShowDatabasePassword(false);
    setShowRedisPassword(false);
    setCreatedDetails(null);
    setImageChecked(false);
    setImageNotLocal(false);
    setNetwork(wizardContext?.internalNetwork || "bridge");
    setRestartPolicy("unless-stopped");
    setPullImage(true);
    setPullViaCli(false);
    setPorts([{ host: "", container: "" }]);
    setEnvVars([]);
    setVolumes([]);
    setEnvFile(null);
    setValidation(null);
    setWizardStep(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const buildPayload = (): CreateContainerPayload => {
    const effectiveImage = preset === "postgres" ? (image || "postgres:16") : preset === "redis" ? (image || "redis:7-alpine") : image;
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

    const effectiveEnv = preset === "postgres"
      ? { ...envMap, POSTGRES_DB: postgresDatabase, POSTGRES_USER: postgresUser, POSTGRES_PASSWORD: postgresPassword }
      : envMap;
    const effectiveVolumes = preset === "postgres"
      ? [{ hostPath: postgresVolume, containerPath: "/var/lib/postgresql/data", readOnly: false, volumeName: postgresVolume }, ...volumes.filter((v) => v.hostPath && v.containerPath)]
      : preset === "redis"
        ? [{ hostPath: redisVolume, containerPath: "/data", readOnly: false, volumeName: redisVolume }, ...volumes.filter((v) => v.hostPath && v.containerPath)]
      : volumes.filter((v) => v.hostPath && v.containerPath);
    const effectivePorts = { ...portMap };
    const effectiveNetwork = preset === "generic" ? network : (wizardContext?.internalNetwork || network);
    return {
      preset,
      name: name || undefined,
      projectSlug: projectSlug || undefined,
      image: effectiveImage,
      ports: Object.keys(effectivePorts).length > 0 ? effectivePorts : undefined,
      env: Object.keys(effectiveEnv).length > 0 ? effectiveEnv : undefined,
      runtimeOptions: preset === "redis" ? { command: redisPassword ? ["redis-server", "--appendonly", "yes", "--requirepass", redisPassword] : ["redis-server", "--appendonly", "yes"] } : undefined,
      network: effectiveNetwork,
      volumes: effectiveVolumes,
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
      setImageChecked(true);
    } catch {
      setImageChecked(false);
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

  const handleEnvPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const content = e.clipboardData.getData("text");
    const looksLikeEnv = content.split(/\r?\n/).some((line) =>
      /^\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line),
    );
    if (!looksLikeEnv) return;

    e.preventDefault();
    const parsed = parseEnvFile(content);
    if (parsed.length === 0) {
      toast.error("No valid KEY=value environment variables found in the clipboard");
      return;
    }

    setEnvVars((existing) => {
      const merged = existing.filter((env) => env.key.trim() || env.value.trim());
      for (const env of parsed) {
        const index = merged.findIndex((current) => current.key === env.key);
        if (index === -1) merged.push(env);
        else merged[index] = env;
      }
      return merged;
    });
    toast.success(`Pasted ${parsed.length} environment variable${parsed.length === 1 ? "" : "s"}`);
  };

  const handleNext = async () => {
    if (wizardStep === 0) {
      if (preset === "postgres" && (!postgresDatabase || !postgresUser || !postgresPassword || !postgresVolume)) {
        toast.error("PostgreSQL database, user, password, and volume are required");
        return;
      }
      if (preset === "redis" && !redisVolume) {
        toast.error("Redis data volume is required");
        return;
      }
      if (preset === "generic" && !image) {
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
          toast.warning("Warnings found. Review before creating");
        } else {
          toast.success("Configuration validated. Review below");
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err));
      } finally {
        setCheckingWizard(false);
      }
    }
  };

  const handleCreate = async () => {
    if (preset === "generic" && !image) {
      toast.error("Image is required");
      return;
    }
    if (preset === "postgres" && (!postgresDatabase || !postgresUser || !postgresPassword || !postgresVolume)) {
      toast.error("PostgreSQL database, user, password, and volume are required");
      return;
    }
    if (preset === "redis" && !redisVolume) {
      toast.error("Redis data volume is required");
      return;
    }
    if (!name && !projectSlug) {
      toast.error("Either a container name or project slug is required");
      return;
    }

    try {
      setCheckingWizard(true);
      const payload = buildPayload();
      const response = await createContainer.mutateAsync(payload);
      toast.success(`Container ${response.data.name || name || projectSlug} queued`, {
        description: "Image pulling and startup are continuing in the background.",
      });
      if (preset === "postgres" || preset === "redis") {
        setCreatedDetails({ id: response.data.id, name: response.data.name || name || projectSlug, ports: response.data.ports });
      } else {
        resetForm();
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setCheckingWizard(false);
    }
  };

  return (
    <SidePanel
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <SidePanelContent className="sm:max-w-2xl">
        <SidePanelHeader className="border-b px-6 py-4 text-left">
          <SidePanelTitle>Create Container: Wizard</SidePanelTitle>
          <SidePanelDescription>
            Configure and create a Docker container, step by step.
          </SidePanelDescription>
        </SidePanelHeader>

        <div className="space-y-6 px-6 py-5">
        {createdDetails ? (
          <section className="space-y-5">
            <div>
              <h3 className="text-base font-semibold">{preset === "postgres" ? "Database" : "Redis"} container queued</h3>
              <p className="text-sm text-muted-foreground">Save these credentials now. Gatekeeperd will not show the container password again after you close this panel.</p>
            </div>
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Container</p><p className="font-mono text-sm">{createdDetails.name}</p></div>
                <Button type="button" variant="outline" size="sm" onClick={() => void copyValue(createdDetails.name, "Container name")}><Copy className="mr-2 h-3.5 w-3.5" />Copy name</Button>
              </div>
              {preset === "postgres" ? <>
                <InfoRow label="Database" value={postgresDatabase} mono />
                <InfoRow label="Username" value={postgresUser} mono />
                <div className="space-y-2"><Label>Password</Label><div className="flex gap-2"><Input readOnly type={showDatabasePassword ? "text" : "password"} value={postgresPassword} /><Button type="button" variant="outline" size="icon" onClick={() => setShowDatabasePassword((visible) => !visible)}>{showDatabasePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button><Button type="button" variant="outline" size="icon" onClick={() => void copyValue(postgresPassword, "Database password")}><Copy className="h-4 w-4" /></Button></div></div>
                <div className="space-y-2"><Label>Docker network URL</Label><div className="flex gap-2"><Input readOnly className="font-mono text-xs" value={encodePostgresUrl(postgresUser, postgresPassword, createdDetails.name, 5432, postgresDatabase)} /><Button type="button" variant="outline" size="icon" onClick={() => void copyValue(encodePostgresUrl(postgresUser, postgresPassword, createdDetails.name, 5432, postgresDatabase), "Docker database URL")}><Copy className="h-4 w-4" /></Button></div><p className="text-xs text-muted-foreground">Use this from another container attached to the selected user-defined Docker network.</p></div>
                {Object.entries(buildPayload().ports ?? {}).filter(([, containerPort]) => containerPort === 5432).map(([hostPort]) => <div key={hostPort} className="space-y-2"><Label>Host database URL</Label><div className="flex gap-2"><Input readOnly className="font-mono text-xs" value={encodePostgresUrl(postgresUser, postgresPassword, "127.0.0.1", Number(hostPort), postgresDatabase)} /><Button type="button" variant="outline" size="icon" onClick={() => void copyValue(encodePostgresUrl(postgresUser, postgresPassword, "127.0.0.1", Number(hostPort), postgresDatabase), "Host database URL")}><Copy className="h-4 w-4" /></Button></div><p className="text-xs text-muted-foreground">Use this from the Docker host. The published port may be reachable from outside the host depending on Docker and firewall configuration.</p></div>)}
              </> : <>
                {redisPassword && <><InfoRow label="Username" value="default" mono />
                <div className="space-y-2"><Label>Password</Label><div className="flex gap-2"><Input readOnly type={showRedisPassword ? "text" : "password"} value={redisPassword} /><Button type="button" variant="outline" size="icon" onClick={() => setShowRedisPassword((visible) => !visible)}>{showRedisPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button><Button type="button" variant="outline" size="icon" onClick={() => void copyValue(redisPassword, "Redis password")}><Copy className="h-4 w-4" /></Button></div></div></>}
                <div className="space-y-2"><Label>Docker network URL</Label><div className="flex gap-2"><Input readOnly className="font-mono text-xs" value={redisPassword ? `redis://default:${encodeURIComponent(redisPassword)}@${createdDetails.name}:6379` : `redis://${createdDetails.name}:6379`} /><Button type="button" variant="outline" size="icon" onClick={() => void copyValue(redisPassword ? `redis://default:${encodeURIComponent(redisPassword)}@${createdDetails.name}:6379` : `redis://${createdDetails.name}:6379`, "Docker Redis URL")}><Copy className="h-4 w-4" /></Button></div><p className="text-xs text-muted-foreground">Use this from another container attached to the selected user-defined Docker network.</p></div>
                {Object.entries(buildPayload().ports ?? {}).filter(([, containerPort]) => containerPort === 6379).map(([hostPort]) => <div key={hostPort} className="space-y-2"><Label>Host Redis URL</Label><div className="flex gap-2"><Input readOnly className="font-mono text-xs" value={redisPassword ? `redis://default:${encodeURIComponent(redisPassword)}@127.0.0.1:${hostPort}` : `redis://127.0.0.1:${hostPort}`} /><Button type="button" variant="outline" size="icon" onClick={() => void copyValue(redisPassword ? `redis://default:${encodeURIComponent(redisPassword)}@127.0.0.1:${hostPort}` : `redis://127.0.0.1:${hostPort}`, "Host Redis URL")}><Copy className="h-4 w-4" /></Button></div><p className="text-xs text-muted-foreground">Use this from the Docker host. The published port may be reachable from outside the host depending on Docker and firewall configuration.</p></div>)}
              </>}
              {!Object.keys(buildPayload().ports ?? {}).length && <p className="text-xs text-muted-foreground">No host port is published. To connect from the host, recreate the container with a host-port mapping.</p>}
            </div>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">{preset === "redis" && !redisPassword ? "Redis has no password and is reachable by containers on its selected network. Use this only on a trusted private Docker network." : "These credentials are also stored in the container environment/configuration. Restrict Docker access and do not expose the database port publicly unless required."}</div>
          </section>
        ) : <>
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
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium">Container identity</h4>
                  <p className="text-xs text-muted-foreground">Choose a preset, then identify this container.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="preset">Service preset</Label>
                    <select id="preset" value={preset} onChange={(e) => { const next = e.target.value as ServicePreset; setPreset(next); if (next === "postgres") { setImage("postgres:16"); setPostgresPassword((current) => current || generatePassword()); setNetwork(wizardContext?.internalNetwork || network); setPorts([{ host: "", container: "5432" }]); } else if (next === "redis") { setImage("redis:7-alpine"); setNetwork(wizardContext?.internalNetwork || network); setPorts([{ host: "", container: "6379" }]); } else { setImage(""); setPorts([{ host: "", container: "" }]); } }} className="w-full h-9 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="generic">Generic container</option>
                      <option value="postgres">PostgreSQL database</option>
                      <option value="redis">Redis cache</option>
                    </select>
                    <p className="text-xs text-muted-foreground">Database and Redis presets configure persistent storage and credentials. Host port publishing is optional.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-app" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectSlug">Project slug</Label>
                    <Input id="projectSlug" value={projectSlug} onChange={(e) => setProjectSlug(e.target.value)} placeholder="my-app (optional)" />
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">Enter a container name or project slug. If the name is blank, Gatekeeperd uses the normalized project slug as the container name.</p>
                </div>
              </div>

              {preset !== "generic" && <div className="space-y-3 border-t pt-4">
                <div>
                  <h4 className="text-sm font-medium">{preset === "postgres" ? "PostgreSQL settings" : "Redis settings"}</h4>
                  <p className="text-xs text-muted-foreground">Data is stored in a named Docker volume.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {preset === "postgres" ? <>
                    <div className="space-y-2"><Label htmlFor="postgresDatabase">Database name</Label><Input id="postgresDatabase" value={postgresDatabase} onChange={(e) => setPostgresDatabase(e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="postgresUser">Database user</Label><Input id="postgresUser" value={postgresUser} onChange={(e) => setPostgresUser(e.target.value)} /></div>
                    <div className="space-y-2 sm:col-span-2"><Label htmlFor="postgresPassword">Database password</Label><div className="flex min-w-0 gap-2"><Input id="postgresPassword" className="min-w-0 flex-1" type={showDatabasePassword ? "text" : "password"} value={postgresPassword} onChange={(e) => setPostgresPassword(e.target.value)} autoComplete="new-password" /><Button type="button" variant="outline" size="icon" className="shrink-0" aria-label={showDatabasePassword ? "Hide database password" : "Show database password"} onClick={() => setShowDatabasePassword((visible) => !visible)}>{showDatabasePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button><Button type="button" variant="outline" size="sm" className="shrink-0 px-3" onClick={() => setPostgresPassword(generatePassword())}>Generate password</Button></div></div>
                    <div className="space-y-2 sm:col-span-2"><Label htmlFor="postgresVolume">Named data volume</Label><select id="postgresVolume" className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm" value={dockerVolumes.some((volume) => volume.name === postgresVolume) ? postgresVolume : "__new__"} onChange={(e) => { if (e.target.value !== "__new__") setPostgresVolume(e.target.value); }}><option value="__new__">Create a new named volume</option>{dockerVolumes.filter((volume) => volume.driver === "local").map((volume) => <option key={volume.name} value={volume.name}>{volume.name}</option>)}</select>{!dockerVolumes.some((volume) => volume.name === postgresVolume) && <Input value={postgresVolume} onChange={(e) => setPostgresVolume(e.target.value)} placeholder="postgres-data" />}</div>
                  </> : <>
                    <div className="space-y-2 sm:col-span-2"><Label htmlFor="redisPassword">Redis password (optional)</Label><div className="flex min-w-0 gap-2"><Input id="redisPassword" className="min-w-0 flex-1" type={showRedisPassword ? "text" : "password"} value={redisPassword} onChange={(e) => setRedisPassword(e.target.value)} autoComplete="new-password" placeholder="No password" /><Button type="button" variant="outline" size="icon" className="shrink-0" aria-label={showRedisPassword ? "Hide Redis password" : "Show Redis password"} onClick={() => setShowRedisPassword((visible) => !visible)}>{showRedisPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button><Button type="button" variant="outline" size="sm" className="shrink-0 px-3" onClick={() => setRedisPassword(generatePassword())}>Generate password</Button></div><p className="text-xs text-muted-foreground">Leave blank to disable authentication. Use only on a trusted private Docker network without a password.</p></div>
                    <div className="space-y-2 sm:col-span-2"><Label htmlFor="redisVolume">Named data volume</Label><select id="redisVolume" className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm" value={dockerVolumes.some((volume) => volume.name === redisVolume) ? redisVolume : "__new__"} onChange={(e) => { if (e.target.value !== "__new__") setRedisVolume(e.target.value); }}><option value="__new__">Create a new named volume</option>{dockerVolumes.filter((volume) => volume.driver === "local").map((volume) => <option key={volume.name} value={volume.name}>{volume.name}</option>)}</select>{!dockerVolumes.some((volume) => volume.name === redisVolume) && <Input value={redisVolume} onChange={(e) => setRedisVolume(e.target.value)} placeholder="redis-data" />}</div>
                  </>}
                </div>
              </div>}

              <div className="space-y-3 border-t pt-4">
                <div>
                  <h4 className="text-sm font-medium">Image and runtime</h4>
                  <p className="text-xs text-muted-foreground">Set the image, restart behavior, and image-pull options.</p>
                </div>
                <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="image">Image *</Label>
                    <Input id="image" value={image} disabled={preset !== "generic"} onChange={(e) => { setImage(e.target.value); setImageChecked(false); setImageNotLocal(false); }} onBlur={handleImageBlur} placeholder="nginx:latest" />
                    {imageChecked && <p className={`text-xs flex items-center gap-1 ${imageNotLocal ? "text-amber-600" : "text-emerald-600"}`}>{imageNotLocal ? <AlertTriangle className="h-3 w-3" /> : <Check className="h-3 w-3" />}{imageNotLocal ? "Image is not available locally. It will be pulled before creation." : "Image is available locally. No pull is needed."}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="restartPolicy">Restart policy</Label>
                    <select id="restartPolicy" value={restartPolicy} onChange={(e) => setRestartPolicy(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="no">no</option><option value="always">always</option><option value="unless-stopped">unless-stopped</option><option value="on-failure">on-failure</option>
                    </select>
                  </div>
                  <div className="space-y-3 sm:pt-1">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pullImage} onChange={(e) => setPullImage(e.target.checked)} className="h-4 w-4 rounded border-input" />Pull image if it is not available locally</label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={pullViaCli} onChange={(e) => setPullViaCli(e.target.checked)} className="h-4 w-4 rounded border-input" />Use host Docker credentials for private image pulls</label>
                  </div>
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
                      disabled={preset !== "generic"}
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
                      Internal network "{wizardContext.internalNetwork}" does not exist yet. It will be created if needed.
                      </p>
                    )}
                  </>
                )}
              </div>
              {preset !== "generic" && <p className="text-xs text-muted-foreground">Database and Redis use the Gatekeeper internal network so containers can resolve them by name.</p>}
              {preset !== "generic" && <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">The standard container port is configured below. Leave the host port blank for Docker-only access; enter a host port only if the Docker host must connect. Other containers should use the container name on the selected internal network.</p>}

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
                      onPaste={handleEnvPaste}
                      onChange={(e) => {
                        const next = [...envVars];
                        next[idx].key = e.target.value;
                        setEnvVars(next);
                      }}
                    />
                    <Input
                      placeholder="Value"
                      value={env.value}
                      onPaste={handleEnvPaste}
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
                  Validated by Gatekeeperd. No changes were applied yet.
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

                  {(preset === "postgres" || preset === "redis") && <div className="rounded-md border p-3 space-y-2"><p className="text-sm font-medium">Connection guidance</p><p className="text-xs text-muted-foreground">From a container on the <span className="font-mono">{validation.normalizedRequest.network}</span> network, connect to <span className="font-mono">{validation.normalizedRequest.name}:{preset === "postgres" ? "5432" : "6379"}</span>. From the Docker host, connect to <span className="font-mono">127.0.0.1:&lt;host-port&gt;</span> only if you enter a host port mapping below. Docker-published ports may be reachable from outside the host depending on firewall settings.</p>{preset === "redis" && !redisPassword && <p className="text-xs font-medium text-amber-700">Redis password authentication is disabled. Only use this on a trusted private Docker network.</p>}</div>}

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
        </>}

        </div>

        <SidePanelFooter className="sticky bottom-0 border-t bg-background px-6 py-4">
          {createdDetails ? (
            <Button type="button" onClick={() => { resetForm(); onOpenChange(false); }}>Done</Button>
          ) : <>
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
          </>}
        </SidePanelFooter>
      </SidePanelContent>
    </SidePanel>
  );
}
