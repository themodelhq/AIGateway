import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Key, BarChart3, AlertCircle, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const [confirmRevokeKeyId, setConfirmRevokeKeyId] = useState<number | null>(null);
  const [confirmRevokeKeyName, setConfirmRevokeKeyName] = useState<string>("");

  // Fetch admin data
  const { data: users = [], isLoading: usersLoading } = trpc.admin.users.useQuery(
    { limit: 100, offset: 0 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const { data: apiKeys = [], isLoading: keysLoading } = trpc.admin.apiKeys.useQuery(
    { limit: 100, offset: 0 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const { data: logs = [], isLoading: logsLoading } = trpc.admin.logs.useQuery(
    { limit: 50, offset: 0 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const { data: stats } = trpc.admin.stats.useQuery(
    { days: 30 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  // Revoke key mutation
  const revokeKeyMutation = trpc.admin.revokeUserKey.useMutation({
    onSuccess: () => {
      toast.success("API key revoked successfully");
      setConfirmRevokeKeyId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke API key");
      setConfirmRevokeKeyId(null);
    },
  });

  const handleRevokeClick = (keyId: number, keyName: string) => {
    setConfirmRevokeKeyId(keyId);
    setConfirmRevokeKeyName(keyName);
  };

  const handleConfirmRevoke = () => {
    if (confirmRevokeKeyId) {
      revokeKeyMutation.mutate({ keyId: confirmRevokeKeyId });
    }
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Card className="card-premium text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You don't have permission to access the admin panel
          </p>
          <Link href="/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
              Go to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-premium">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400 opacity-20" />
            </div>
          </Card>

          <Card className="card-premium">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total API Keys</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{apiKeys.length}</p>
              </div>
              <Key className="w-8 h-8 text-blue-600 dark:text-blue-400 opacity-20" />
            </div>
          </Card>

          <Card className="card-premium">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Requests (30d)</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stats?.totalRequests?.toLocaleString() || "0"}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="keys">API Keys</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h2>

            {usersLoading ? (
              <Card className="card-premium text-center py-12">
                <p className="text-slate-600 dark:text-slate-400">Loading users...</p>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Role</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Joined</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{u.name || "N/A"}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{u.email || "N/A"}</td>
                        <td className="py-3 px-4">
                          <span className={`badge-${u.role === "admin" ? "primary" : "secondary"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {new Date(u.lastSignedIn).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">API Keys Management</h2>

            {keysLoading ? (
              <Card className="card-premium text-center py-12">
                <p className="text-slate-600 dark:text-slate-400">Loading API keys...</p>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Key</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">User</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Created</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((key) => (
                      <tr key={key.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="py-3 px-4 font-mono text-sm text-slate-600 dark:text-slate-400">
                          {key.keyPrefix}...
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{key.userName || "N/A"}</td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{key.name}</td>
                        <td className="py-3 px-4">
                          {key.isActive ? (
                            <span className="badge-success">Active</span>
                          ) : (
                            <span className="badge-secondary">Revoked</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {new Date(key.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {key.isActive && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRevokeClick(key.id, key.name)}
                              disabled={revokeKeyMutation.isPending}
                              className="gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              Revoke
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Activity Logs</h2>

            {logsLoading ? (
              <Card className="card-premium text-center py-12">
                <p className="text-slate-600 dark:text-slate-400">Loading activity logs...</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <Card key={log.id} className="card-premium">
                    <div className="flex items-start justify-between">
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-900 dark:text-white">{log.action}</p>
                          <span className="badge-secondary text-xs">{log.adminName || "System"}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
