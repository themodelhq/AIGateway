import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, BarChart3, Settings, LogOut, Sparkles, Plus, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import ApiKeyModal from "@/components/ApiKeyModal";
import UsageChart from "@/components/UsageChart";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  const [confirmRevokeKeyId, setConfirmRevokeKeyId] = useState<number | null>(null);
  const [confirmRevokeKeyName, setConfirmRevokeKeyName] = useState<string>("");

  // Fetch API keys
  const { data: apiKeys = [], isLoading: keysLoading, refetch: refetchKeys } = trpc.apiKeys.list.useQuery();

  // Fetch models
  const { data: models = [] } = trpc.models.list.useQuery();

  // Revoke key mutation
  const revokeKeyMutation = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      toast.success("API key revoked successfully");
      setConfirmRevokeKeyId(null);
      refetchKeys();
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

  const toggleKeyVisibility = (keyId: number) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">AI Gateway</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-400">Welcome, {user?.name}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards */}
          <Card className="card-premium">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Active Keys</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{apiKeys.filter(k => k.isActive).length}</p>
              </div>
              <Key className="w-8 h-8 text-blue-600 dark:text-blue-400 opacity-20" />
            </div>
          </Card>

          <Card className="card-premium">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Available Models</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{models.length}</p>
              </div>
              <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400 opacity-20" />
            </div>
          </Card>

          <Card className="card-premium">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Account Status</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">Active</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-400 opacity-20" />
            </div>
          </Card>

          <Card className="card-premium">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Role</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white capitalize">{user?.role || 'User'}</p>
              </div>
              <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="keys" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="keys">API Keys</TabsTrigger>
            <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
            <TabsTrigger value="models">Available Models</TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your API Keys</h2>
              <Button
                onClick={() => setShowKeyModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Key
              </Button>
            </div>

            {keysLoading ? (
              <div className="text-center py-12">
                <p className="text-slate-600 dark:text-slate-400">Loading API keys...</p>
              </div>
            ) : apiKeys.length === 0 ? (
              <Card className="card-premium text-center py-12">
                <Key className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
                <p className="text-slate-600 dark:text-slate-400 mb-4">No API keys yet</p>
                <Button
                  onClick={() => setShowKeyModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Key
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <Card key={key.id} className="card-premium">
                    <div className="flex items-start justify-between">
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white">{key.name}</h3>
                          {key.isActive ? (
                            <span className="badge-success">Active</span>
                          ) : (
                            <span className="badge-secondary">Revoked</span>
                          )}
                        </div>
                        {key.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{key.description}</p>
                        )}
                        <div className="flex items-center gap-2 mb-3">
                          <code className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded text-sm font-mono text-slate-900 dark:text-white">
                            {key.keyPrefix}...
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(key.keyPrefix, "Key prefix")}
                            className="gap-1"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
                          <span>Rate Limit: {key.rateLimit} req/min</span>
                          <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                          {key.lastUsedAt && (
                            <span>Last Used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleKeyVisibility(key.id)}
                          className="gap-1"
                        >
                          {visibleKeys.has(key.id) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        {key.isActive && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRevokeClick(key.id, key.name)}
                            className="gap-1"
                            disabled={revokeKeyMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Usage Analytics Tab */}
          <TabsContent value="usage" className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Usage Analytics</h2>
            {apiKeys.filter(k => k.isActive).length > 0 ? (
              <UsageChart apiKey={apiKeys.find(k => k.isActive)} />
            ) : (
              <Card className="card-premium text-center py-12">
                <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
                <p className="text-slate-600 dark:text-slate-400">Create an API key to view usage analytics</p>
              </Card>
            )}
          </TabsContent>

          {/* Available Models Tab */}
          <TabsContent value="models" className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Available Models</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model) => (
                <Card key={model.id} className="card-premium hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{model.name}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{model.provider}</p>
                    </div>
                  </div>
                  {model.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{model.description}</p>
                  )}
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {model.maxTokens && <p>Max Tokens: {model.maxTokens.toLocaleString()}</p>}
                    {model.costPer1kTokens && <p>Cost: ${model.costPer1kTokens}/1K tokens</p>}
                  </div>
                  <Link href="/playground">
                    <Button size="sm" className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                      Test in Playground
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal isOpen={showKeyModal} onClose={() => setShowKeyModal(false)} onSuccess={() => refetchKeys()} />

      {/* Confirm Revoke Dialog */}
      <ConfirmDialog
        open={confirmRevokeKeyId !== null}
        title="Revoke API Key?"
        description={`Are you sure you want to revoke the API key "${confirmRevokeKeyName}"? This action cannot be undone and any applications using this key will stop working.`}
        confirmText="Revoke Key"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={revokeKeyMutation.isPending}
        onConfirm={handleConfirmRevoke}
        onCancel={() => setConfirmRevokeKeyId(null)}
      />
    </div>
  );
}
