import { useRef, useState } from "react";
import { FileUp, Plus, X } from "lucide-react";
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
import { useCreateContainer } from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/api";
import type { VolumeMount } from "@/types/container";

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

function parseEnvFile(content: string): EnvVar[] {
  const vars: EnvVar[] = [];
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Skip empty lines and comments
    if (!line || line.startsWith("#")) continue;

    // Strip optional `export ` prefix
    const cleaned = line.startsWith("export ") ? line.slice(7).trim() : line;

    // Split on the first `=`
    const eqIndex = cleaned.indexOf("=");
    if (eqIndex === -1) continue;

    const key = cleaned.slice(0, eqIndex).trim();
    let value = cleaned.slice(eqIndex + 1).trim();

    // Strip surrounding quotes if present
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

export function CreateContainerDialog({ open, onOpenChange }: CreateContainerDialogProps) {
  const createContainer = useCreateContainer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [network, setNetwork] = useState("bridge");
  const [restartPolicy, setRestartPolicy] = useState("unless-stopped");
  const [pullImage, setPullImage] = useState(true);
  const [ports, setPorts] = useState<PortMapping[]>([{ host: "", container: "" }]);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [volumes, setVolumes] = useState<VolumeMount[]>([]);
  const [envFile, setEnvFile] = useState<File | null>(null);

  const resetForm = () => {
    setName("");
    setImage("");
    setNetwork("bridge");
    setRestartPolicy("unless-stopped");
    setPullImage(true);
    setPorts([{ host: "", container: "" }]);
    setEnvVars([]);
    setVolumes([]);
    setEnvFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

      // Merge parsed vars with existing ones — parsed file overrides duplicates
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
    } catch (err) {
      toast.error("Failed to read the .env file");
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !image) {
      toast.error("Name and image are required");
      return;
    }

    const portMap: Record<string, number> = {};
    for (const p of ports) {
      if (p.host && p.container) {
        portMap[p.host] = parseInt(p.container, 10);
      }
    }

    const envMap: Record<string, string> = {};
    for (const env of envVars) {
      if (env.key && env.value) {
        envMap[env.key] = env.value;
      }
    }

    try {
      await createContainer.mutateAsync({
        name,
        image,
        ports: portMap,
        env: Object.keys(envMap).length > 0 ? envMap : undefined,
        network,
        volumes: volumes.filter((v) => v.hostPath && v.containerPath),
        restartPolicy: restartPolicy as "no" | "always" | "unless-stopped" | "on-failure",
        pullImage,
      });
      toast.success(`Container ${name} created`);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Container</DialogTitle>
          <DialogDescription>
            Create and start a new Docker container with custom configuration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-app" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Image *</Label>
              <Input id="image" value={image} onChange={(e) => setImage(e.target.value)} placeholder="nginx:latest" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="network">Network</Label>
              <Input id="network" value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="bridge" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restartPolicy">Restart Policy</Label>
              <select
                id="restartPolicy"
                value={restartPolicy}
                onChange={(e) => setRestartPolicy(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="no">no</option>
                <option value="always">always</option>
                <option value="unless-stopped">unless-stopped</option>
                <option value="on-failure">on-failure</option>
              </select>
            </div>
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pullImage"
              checked={pullImage}
              onChange={(e) => setPullImage(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="pullImage">Pull image before creating</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createContainer.isPending}>
              {createContainer.isPending ? "Creating..." : "Create Container"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}