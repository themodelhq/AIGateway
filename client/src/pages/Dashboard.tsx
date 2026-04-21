import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, BarChart3, Settings, LogOut, Sparkles, Plus, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { apiBase } from "@/lib/apiBase";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import ApiKeyModal from "@/components/ApiKeyModal";
import UsageChart from "@/components/UsageChart";
import ConfirmDialog from "@/components/ConfirmDialog";

interface GatewayModel {
  id: string;
  object: string;
  owned_by: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  const [confirmRevokeKeyId, setConfirmRevokeKeyId] = useState<number | null>(null);
  const [confirmRevokeKeyName, setConfirmRevokeKeyName] = useState<string>("");
  const [gatewayModels, setGatewayModels] = useState<GatewayModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  // Fetch API keys
  const { data: apiKeys = [], isLoading: keysLoading, refetch: refetchKeys } = trpc.apiKeys.list.useQuery();

  // Fetch models from the public /v1/models gateway endpoint
  useEffect(() => {
    const base = apiBase || "";
    fetch(`${base}/v1/models`)
      .then(r => r.json())
      .then(data => { setGatewayModels(data.data ?? []); })
      .catch(() => setGatewayModels([]))
      .finally(() => setModelsLoading(false));
  }, []);

  const PROVIDER_META: Record<string, { icon: string; color: string; description: string; maxTokens: string; cost: string }> = {
    openai:      { icon: "🤖", color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800", description: "OpenAI models",           maxTokens: "up to 128K",  cost: "from $0.15/1M" },
    anthropic:   { icon: "🧠", color: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",   description: "Anthropic Claude",        maxTokens: "up to 200K",  cost: "from $0.25/1M" },
    groq:        { icon: "⚡", color: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800",   description: "Ultra-fast Groq inference", maxTokens: "up to 32K",   cost: "from $0.05/1M" },
    mistral:     { icon: "🌊", color: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800",   description: "Mistral AI models",        maxTokens: "up to 32K",   cost: "from $0.25/1M" },
    google:      { icon: "✨", color: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",           description: "Google Gemini models",     maxTokens: "up to 1M",    cost: "from $0.07/1M" },
    openrouter:  { icon: "🆓", color: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",       description: "28 free models — no credit card · 20 req/min · 200 req/day", maxTokens: "up to 262K", cost: "FREE" },
    ollama:      { icon: "🦙", color: "bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-600",       description: "Self-hosted / Ollama Cloud", maxTokens: "up to 32K",  cost: "self-hosted" },
  };

  // Group models by provider
  const modelsByProvider = gatewayModels.reduce<Record<string, GatewayModel[]>>((acc, m) => {
    const p = m.owned_by;
    if (!acc[p]) acc[p] = [];
    acc[p].push(m);
    return acc;
  }, {});

  // Revoke key mutation
  const revokeKeyMutation = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => { toast.success("API key revoked successfully"); setConfirmRevokeKeyId(null); refetchKeys(); },
    onError:   (error) => { toast.error(error.message || "Failed to revoke API key"); setConfirmRevokeKeyId(null); },
  });

  const handleRevokeClick    = (keyId: number, keyName: string) => { setConfirmRevokeKeyId(keyId); setConfirmRevokeKeyName(keyName); };
  const handleConfirmRevoke  = () => { if (confirmRevokeKeyId) revokeKeyMutation.mutate({ keyId: confirmRevokeKeyId }); };
  const toggleKeyVisibility  = (keyId: number) => setVisibleKeys(prev => { const s = new Set(prev); s.has(keyId) ? s.delete(keyId) : s.add(keyId); return s; });
  const copyToClipboard      = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} copied to clipboard`); };

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
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{gatewayModels.length}</p>
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
            {modelsLoading ? (
              <div className="text-center py-12 text-slate-500">Loading models…</div>
            ) : gatewayModels.length === 0 ? (
              <Card className="card-premium text-center py-12">
                <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
                <p className="text-slate-600 dark:text-slate-400">No models available yet</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(modelsByProvider).map(([provider, provModels]) => {
                  const meta = PROVIDER_META[provider] ?? { icon: "🔮", color: "bg-slate-50 border-slate-200", description: "", maxTokens: "", cost: "" };
                  return (
                    <div key={provider}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{meta.icon}</span>
                        <h3 className="font-semibold text-slate-900 dark:text-white capitalize">{provider}</h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{meta.description}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {provModels.map((model) => (
                          <Card key={model.id} className={`p-4 border ${meta.color} hover:shadow-md transition-all duration-200`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0 pr-2">
                                <h4 className="font-medium text-slate-900 dark:text-white text-sm truncate">{model.id}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">{model.owned_by}</p>
                              </div>
                              {(model as any).free
                                ? <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full font-bold shrink-0">FREE</span>
                                : <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium shrink-0">Paid</span>
                              }
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                                <p>{meta.maxTokens}</p>
                                <p>{meta.cost}</p>
                              </div>
                              <Link href="/playground">
                                <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                                  Test →
                                </Button>
                              </Link>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
