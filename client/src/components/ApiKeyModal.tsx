import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Copy, Check, X } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PROVIDERS = [
  {
    name: "OpenAI",
    icon: "🤖",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    models: [
      { id: 1, label: "GPT-4o",        modelId: "gpt-4o" },
      { id: 2, label: "GPT-4 Turbo",   modelId: "gpt-4-turbo" },
      { id: 3, label: "GPT-3.5 Turbo", modelId: "gpt-3.5-turbo" },
    ],
  },
  {
    name: "Anthropic",
    icon: "🧠",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    models: [
      { id: 4, label: "Claude 3.5 Sonnet", modelId: "claude-3-5-sonnet" },
      { id: 5, label: "Claude 3 Opus",     modelId: "claude-3-opus" },
      { id: 6, label: "Claude 3 Haiku",    modelId: "claude-3-haiku" },
    ],
  },
  {
    name: "Google Gemini",
    icon: "✨",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    models: [
      { id: 7, label: "Gemini 1.5 Pro",   modelId: "gemini-1.5-pro" },
      { id: 8, label: "Gemini 1.5 Flash", modelId: "gemini-1.5-flash" },
    ],
  },
  {
    name: "Mistral",
    icon: "⚡",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    models: [
      { id: 9,  label: "Mistral Large", modelId: "mistral-large" },
      { id: 10, label: "Mistral 7B",    modelId: "mistral-7b" },
    ],
  },
  {
    name: "Meta LLaMA",
    icon: "🦙",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    models: [
      { id: 11, label: "LLaMA 3 70B", modelId: "llama-3-70b" },
      { id: 12, label: "LLaMA 3 8B",  modelId: "llama-3-8b" },
    ],
  },
];

const ALL_MODELS = PROVIDERS.flatMap(p => p.models.map(m => ({ ...m, provider: p.name })));

export default function ApiKeyModal({ isOpen, onClose, onSuccess }: ApiKeyModalProps) {
  const [step, setStep] = useState<"create" | "display">("create");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rateLimit: 1000,
  });
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);
  const [allModels, setAllModels] = useState(true); // true = access to all models
  const [createdKey, setCreatedKey] = useState<{ id: number; key: string; keyPrefix: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const createKeyMutation = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => { setCreatedKey(data); setStep("display"); },
    onError:   (error) => { toast.error(error.message || "Failed to create API key"); },
  });

  const toggleModel = (id: number) => {
    setSelectedModelIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!formData.name.trim()) { toast.error("Please enter a key name"); return; }
    if (!allModels && selectedModelIds.length === 0) {
      toast.error("Please select at least one model, or allow all models");
      return;
    }
    createKeyMutation.mutate({
      name:          formData.name,
      description:   formData.description || undefined,
      rateLimit:     formData.rateLimit,
      allowedModels: allModels ? undefined : selectedModelIds,
    });
  };

  const handleCopyKey = () => {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("API key copied to clipboard");
  };

  const handleClose = () => {
    setStep("create");
    setFormData({ name: "", description: "", rateLimit: 1000 });
    setSelectedModelIds([]);
    setAllModels(true);
    setCreatedKey(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {step === "create" ? (
          <>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>Generate a new API key for your application</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-sm font-medium">Key Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production API Key"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What will you use this key for?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 resize-none"
                  rows={2}
                />
              </div>

              {/* Rate Limit */}
              <div>
                <Label htmlFor="rateLimit" className="text-sm font-medium">Rate Limit (requests/minute)</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  min="1"
                  max="10000"
                  value={formData.rateLimit}
                  onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) || 1000 })}
                  className="mt-1"
                />
              </div>

              {/* Model Access */}
              <div>
                <Label className="text-sm font-medium">Model Access</Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                  Choose which AI models this key can access
                </p>

                {/* All models toggle */}
                <button
                  type="button"
                  onClick={() => { setAllModels(true); setSelectedModelIds([]); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm font-medium mb-3 transition-colors ${
                    allModels
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-600"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  🌐 All models (current &amp; future)
                </button>

                {/* Specific models */}
                <button
                  type="button"
                  onClick={() => setAllModels(false)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm font-medium mb-3 transition-colors ${
                    !allModels
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-600"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  🔒 Restrict to specific models
                </button>

                {!allModels && (
                  <div className="space-y-3 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    {PROVIDERS.map(provider => (
                      <div key={provider.name}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-sm">{provider.icon}</span>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                            {provider.name}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-5">
                          {provider.models.map(model => {
                            const selected = selectedModelIds.includes(model.id);
                            return (
                              <button
                                key={model.id}
                                type="button"
                                onClick={() => toggleModel(model.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                                  selected
                                    ? `${provider.color} border-transparent`
                                    : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                }`}
                              >
                                {model.label}
                                {selected && <X className="w-3 h-3 ml-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {selectedModelIds.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {selectedModelIds.length} model{selectedModelIds.length !== 1 ? "s" : ""} selected
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={createKeyMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createKeyMutation.isPending ? "Creating..." : "Create Key"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>Save your API key securely. You won't be able to see it again!</DialogDescription>
            </DialogHeader>

            {createdKey && (
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Save this key in a secure location. You won't be able to view it again.
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Your API Key</Label>
                  <div className="flex gap-2">
                    <code className="flex-grow bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded font-mono text-sm break-all">
                      {createdKey.key}
                    </code>
                    <Button size="sm" variant="outline" onClick={handleCopyKey} className="flex-shrink-0">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {!allModels && selectedModelIds.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Allowed Models</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedModelIds.map(id => {
                        const m = ALL_MODELS.find(m => m.id === id);
                        const p = PROVIDERS.find(p => p.name === m?.provider);
                        return m ? (
                          <Badge key={id} variant="secondary" className={p?.color}>
                            {m.label}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {allModels && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Model Access</Label>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                      🌐 All models
                    </Badge>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Use this key with: <code className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">Authorization: Bearer YOUR_API_KEY</code>
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button onClick={() => { handleClose(); onSuccess(); }} className="bg-blue-600 hover:bg-blue-700 text-white">
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
