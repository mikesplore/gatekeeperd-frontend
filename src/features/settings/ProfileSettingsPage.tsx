import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Check, CircleHelp, RefreshCw, TriangleAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";

type Setup = { secret: string; otpauthUri: string; recoveryCodes: string[] };
type Tab = "general" | "security";
type VersionStatus = {
  status: "up_to_date" | "update_available" | "deployment_failed" | "check_stale" | "unknown";
  runningCommit: string | null;
  latestSuccessfulCommit: string | null;
  checkedAt: string | null;
  upToDate: boolean | null;
};

const versionMessages: Record<VersionStatus["status"], string> = {
  up_to_date: "This server is running the latest successful build.",
  update_available: "A newer successful build is available and has not been deployed.",
  deployment_failed: "The latest successful build failed to deploy. The previous version is still running.",
  check_stale: "The server has not checked GitHub recently. The status may be out of date.",
  unknown: "Version status is not available yet. The auto-deploy checker may not have run.",
};

export function ProfileSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const email = useAuthStore((s) => s.email);
  const role = useAuthStore((s) => s.role);
  const [tab, setTab] = useState<Tab>(() => searchParams.get("tab") === "security" ? "security" : "general");
  const selectTab = (value: Tab) => { setTab(value); const next = new URLSearchParams(searchParams); if (value === "general") next.delete("tab"); else next.set("tab", value); setSearchParams(next); };
  const [displayName, setDisplayName] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[] | null>(null);
  const account = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () =>
      (
        await api.get<{
          displayName?: string;
          avatarUrl?: string;
          totpEnabled?: boolean;
        }>("/auth/me")
      ).data,
  });
  const profile = useMutation({
    mutationFn: () => api.patch("/auth/me", { displayName }),
  });
  const password = useMutation({
    mutationFn: () =>
      api.post("/auth/password", { currentPassword, newPassword }),
  });
  const setup2fa = useMutation({
    mutationFn: async () => (await api.post<Setup>("/auth/2fa/setup")).data,
  });
  const enable2fa = useMutation({
    mutationFn: () => api.post("/auth/2fa/enable", { code: setupCode }),
  });
  const disable2fa = useMutation({
    mutationFn: () =>
      api.post("/auth/2fa/disable", {
        currentPassword: disablePassword,
        code: disableCode,
      }),
  });
  const regenerate2fa = useMutation({
    mutationFn: async () => (await api.post<{ recoveryCodes: string[] }>("/auth/2fa/recovery-codes/regenerate", { currentPassword: disablePassword, code: disableCode })).data,
  });
  const versionCheck = useMutation({
    mutationFn: async () => (await api.get<VersionStatus>("/version")).data,
  });
  useEffect(() => {
    if (account.data?.displayName !== undefined)
      setDisplayName(account.data.displayName);
  }, [account.data?.displayName]);
  useEffect(() => {
    if (setup)
      void QRCode.toDataURL(setup.otpauthUri, { width: 220, margin: 1 }).then(
        setQrCode,
      );
    else setQrCode(null);
  }, [setup]);
  const run = async (
    action: () => Promise<unknown>,
    message: string,
    reset?: () => void,
  ) => {
    try {
      await action();
      reset?.();
      await account.refetch();
      toast.success(message);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };
  return (
    <div className="max-w-5xl space-y-6">
      <div>
      <p className="text-sm text-muted-foreground">
          Manage your account, security, and connected services.
        </p>
      </div>
      <div className="flex gap-1 border-b">
        <Button
          variant={tab === "general" ? "secondary" : "ghost"}
          onClick={() => selectTab("general")}
        >
          General
        </Button>
        <Button
          variant={tab === "security" ? "secondary" : "ghost"}
          onClick={() => selectTab("security")}
        >
          Security
        </Button>
      </div>
      {tab === "general" && (
        <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Update the identity shown in the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-2xl space-y-5">
            <div className="flex items-center gap-3">
              {account.data?.avatarUrl && (
                <img
                  src={account.data.avatarUrl}
                  alt="Profile"
                  className="h-12 w-12 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <span className="text-xs text-muted-foreground">
                Profile image is loaded from Gravatar when available.
              </span>
            </div>
            <div className="grid max-w-xl gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input readOnly value={email ?? ""} />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Input readOnly value={role ?? ""} />
              </div>
              <div className="space-y-1">
                <Label>Display name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                />
              </div>
            </div>
            <Button
              disabled={profile.isPending}
              onClick={() =>
                run(() => profile.mutateAsync(), "Profile updated")
              }
            >
              {profile.isPending ? "Saving…" : "Save profile"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deployment version</CardTitle>
            <CardDescription>Check whether this server is running the latest successful Gatekeeperd build.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                disabled={versionCheck.isPending}
                onClick={() => versionCheck.mutate()}
              >
                <RefreshCw className={versionCheck.isPending ? "animate-spin" : ""} />
                {versionCheck.isPending ? "Checking…" : "Check deployment"}
              </Button>
              {versionCheck.data && (
                <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${versionCheck.data.status === "up_to_date" ? "border-emerald-500/30 text-emerald-600" : versionCheck.data.status === "update_available" || versionCheck.data.status === "deployment_failed" ? "border-amber-500/30 text-amber-600" : "text-muted-foreground"}`}>
                  {versionCheck.data.status === "up_to_date" ? <Check className="h-4 w-4" /> : versionCheck.data.status === "update_available" || versionCheck.data.status === "deployment_failed" ? <TriangleAlert className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}
                  {versionMessages[versionCheck.data.status]}
                </span>
              )}
            </div>
            {versionCheck.data && (
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div><span className="text-muted-foreground">Running commit</span><p className="font-mono">{versionCheck.data.runningCommit?.slice(0, 12) ?? "Unknown"}</p></div>
                <div><span className="text-muted-foreground">Latest successful build</span><p className="font-mono">{versionCheck.data.latestSuccessfulCommit?.slice(0, 12) ?? "Unknown"}</p></div>
                {versionCheck.data.checkedAt && <p className="text-xs text-muted-foreground sm:col-span-2">Last check: {new Date(versionCheck.data.checkedAt).toLocaleString()}</p>}
              </div>
            )}
            {versionCheck.isError && <p role="alert" className="text-sm text-destructive">{getApiErrorMessage(versionCheck.error)}</p>}
          </CardContent>
        </Card>
        </div>
      )}
      {tab === "security" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Use at least 8 characters and keep it unique.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-xl space-y-4">
              <div className="space-y-1">
                <Label>Current password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>New password</Label>
                <Input
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <Button
                disabled={
                  password.isPending ||
                  !currentPassword ||
                  newPassword.length < 8
                }
                onClick={() =>
                  run(
                    () => password.mutateAsync(),
                    "Password changed",
                    () => {
                      setCurrentPassword("");
                      setNewPassword("");
                    },
                  )
                }
              >
                {password.isPending ? "Changing…" : "Change password"}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Two-factor authentication</CardTitle>
              {!account.data?.totpEnabled && <CardDescription>Add an authenticator app as a second layer of protection.</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-5">
              {account.data?.totpEnabled ? (
                <>
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-600">
                    Two-factor authentication is enabled.
                  </div>
                  <div className="space-y-3 border-t pt-4">
                    <p className="text-sm font-medium">
                      Disable two-factor authentication
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        type="password"
                        placeholder="Current password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                      />
                      <Input
                        placeholder="Authenticator or recovery code"
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      disabled={
                        disable2fa.isPending || !disablePassword || !disableCode
                      }
                      onClick={() =>
                        run(
                          () => disable2fa.mutateAsync(),
                          "Two-factor authentication disabled",
                          () => {
                            setDisablePassword("");
                            setDisableCode("");
                          },
                        )
                      }
                    >
                      Disable 2FA
                    </Button>
                    <Button variant="ghost" disabled={regenerate2fa.isPending || !disablePassword || !disableCode} onClick={async () => { try { setRegeneratedCodes((await regenerate2fa.mutateAsync()).recoveryCodes); toast.success("Recovery codes regenerated"); } catch (error) { toast.error(getApiErrorMessage(error)); } }}>
                      {regenerate2fa.isPending ? "Regenerating…" : "Regenerate recovery codes"}
                    </Button>
                    {regeneratedCodes && <div className="max-w-md rounded-md border p-3"><p className="text-sm font-medium">New recovery codes</p><p className="text-xs text-muted-foreground">Previous codes are no longer valid. Save these now.</p><div className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs">{regeneratedCodes.map(code => <span key={code}>{code}</span>)}</div></div>}
                  </div>
                </>
              ) : !setup ? (
                <Button
                  onClick={async () => {
                    try {
                      setSetup(await setup2fa.mutateAsync());
                    } catch (error) {
                      toast.error(getApiErrorMessage(error));
                    }
                  }}
                  disabled={setup2fa.isPending}
                >
                  {setup2fa.isPending ? "Preparing…" : "Enable 2FA"}
                </Button>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Scan the QR code with Google Authenticator, save the
                    recovery codes, then verify the app code.
                  </p>
                  {qrCode && (
                    <img
                      src={qrCode}
                      alt="Authenticator setup QR code"
                      className="h-44 w-44 rounded border bg-white p-2"
                    />
                  )}
                  <div className="space-y-1">
                    <Label>Manual setup key</Label>
                    <Input
                      readOnly
                      value={setup.secret}
                      className="max-w-md font-mono text-xs"
                    />
                  </div>
                  <div className="max-w-md rounded-md border p-3">
                    <p className="text-sm font-medium">Recovery codes</p>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Store these safely. Each code can be used once.
                    </p>
                    <div className="grid grid-cols-2 gap-1 font-mono text-xs">
                      {setup.recoveryCodes.map((code) => (
                        <span key={code}>{code}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex max-w-md gap-2">
                    <Input
                      inputMode="numeric"
                      placeholder="6-digit code"
                      value={setupCode}
                      onChange={(e) => setSetupCode(e.target.value)}
                      maxLength={6}
                    />
                    <Button
                      disabled={enable2fa.isPending || setupCode.length !== 6}
                      onClick={() =>
                        run(
                          () => enable2fa.mutateAsync(),
                          "Two-factor authentication enabled",
                          () => {
                            setSetup(null);
                            setSetupCode("");
                          },
                        )
                      }
                    >
                      Verify and enable
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
