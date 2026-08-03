import { useState } from "react";
import { Server, Shield, Trash2, ToggleLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryState } from "@/components/QueryState";
import { useNginxStatus, useEnableNginx, useDisableNginx, useRemoveNginx, useInstallCertificate, useCertificateStatus } from "@/hooks/useNginx";
import { useProjects } from "@/hooks/useProjects";
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
import { useForm } from "react-hook-form";

interface EnableFormData {
  port?: number;
  sslCertificatePath?: string;
  sslCertificateKeyPath?: string;
}

interface CertificateFormData {
  domain: string;
  email: string;
}

export function NginxPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const selectedProjectData = projects?.find((p) => p.slug === selectedSlug);
  const selectedDomain = selectedProjectData?.domain ?? "";

  const { data: nginxStatus, isLoading: statusLoading, refetch: refetchStatus } = useNginxStatus(selectedSlug);
  const enableNginx = useEnableNginx();
  const disableNginx = useDisableNginx();
  const removeNginx = useRemoveNginx();
  const installCertificate = useInstallCertificate();

  const { data: certStatus } = useCertificateStatus(selectedDomain);

  const {
    register: registerEnable,
    handleSubmit: handleSubmitEnable,
    reset: resetEnable,
  } = useForm<EnableFormData>();

  const {
    register: registerCert,
    handleSubmit: handleSubmitCert,
    reset: resetCert,
  } = useForm<CertificateFormData>();

  const handleEnable = async (data: EnableFormData) => {
    if (!selectedSlug) return;
    try {
      await enableNginx.mutateAsync({ slug: selectedSlug, payload: data });
      setEnableDialogOpen(false);
      resetEnable();
      refetchStatus();
    } catch (error) {
      console.error("Failed to enable nginx:", error);
    }
  };

  const handleDisable = async () => {
    if (!selectedSlug || !confirm("Are you sure you want to disable this nginx site?")) return;
    try {
      await disableNginx.mutateAsync(selectedSlug);
      refetchStatus();
    } catch (error) {
      console.error("Failed to disable nginx:", error);
    }
  };

  const handleRemove = async () => {
    if (!selectedSlug || !confirm("Are you sure you want to remove this nginx site configuration? This cannot be undone.")) return;
    try {
      await removeNginx.mutateAsync(selectedSlug);
      refetchStatus();
    } catch (error) {
      console.error("Failed to remove nginx:", error);
    }
  };

  const handleInstallCertificate = async (data: CertificateFormData) => {
    if (!selectedProject) return;
    try {
      await installCertificate.mutateAsync({ domain: data.domain, email: data.email });
      setCertificateDialogOpen(false);
      resetCert();
    } catch (error) {
      console.error("Failed to install certificate:", error);
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
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Domain</p>
                      <p className="text-sm break-all">{nginxStatus.domain || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Port</p>
                      <p className="text-sm">{nginxStatus.port || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Config Path</p>
                      <p className="text-sm break-all font-mono text-xs">{nginxStatus.configPath || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SSL Enabled</p>
                      <div className="flex items-center gap-2">
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
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    {!nginxStatus.enabled ? (
                      <Button onClick={() => setEnableDialogOpen(true)} size="sm">
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
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Certificate Path</p>
                                <p className="text-sm break-all font-mono text-xs">{certStatus.certificatePath}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Private Key Path</p>
                                <p className="text-sm break-all font-mono text-xs">{certStatus.privateKeyPath}</p>
                              </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Nginx Site</DialogTitle>
            <DialogDescription>
              Configure nginx to serve this project. The app port must be active.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEnable(handleEnable)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="port">Port (optional if in containerName)</Label>
              <Input id="port" type="number" {...registerEnable("port", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sslCertificatePath">SSL Certificate Path (optional)</Label>
              <Input id="sslCertificatePath" {...registerEnable("sslCertificatePath")} placeholder="/etc/letsencrypt/live/example.com/fullchain.pem" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sslCertificateKeyPath">SSL Certificate Key Path (optional)</Label>
              <Input id="sslCertificateKeyPath" {...registerEnable("sslCertificateKeyPath")} placeholder="/etc/letsencrypt/live/example.com/privkey.pem" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEnableDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={enableNginx.isPending}>
                {enableNginx.isPending ? "Enabling..." : "Enable"}
              </Button>
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