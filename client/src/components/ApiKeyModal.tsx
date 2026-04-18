import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { useState as useStateForCopy } from "react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApiKeyModal({ isOpen, onClose, onSuccess }: ApiKeyModalProps) {
  const [step, setStep] = useState<"create" | "display">("create");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rateLimit: 1000,
  });
  const [createdKey, setCreatedKey] = useState<{
    id: number;
    key: string;
    keyPrefix: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const createKeyMutation = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data);
      setStep("display");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create API key");
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    createKeyMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      rateLimit: formData.rateLimit,
    });
  };

  const handleCopyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("API key copied to clipboard");
    }
  };

  const handleClose = () => {
    setStep("create");
    setFormData({ name: "", description: "", rateLimit: 1000 });
    setCreatedKey(null);
    setCopied(false);
    onClose();
  };

  const handleSuccess = () => {
    handleClose();
    onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "create" ? (
          <>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for your application
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  Key Name *
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Production API Key"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="What will you use this key for?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="rateLimit" className="text-sm font-medium">
                  Rate Limit (requests/minute)
                </Label>
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
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
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
              <DialogDescription>
                Save your API key securely. You won't be able to see it again!
              </DialogDescription>
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
                    <code className="flex-grow bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded font-mono text-sm text-slate-900 dark:text-white break-all">
                      {createdKey.key}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyKey}
                      className="flex-shrink-0"
                    >
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Key Prefix</Label>
                  <code className="block bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded font-mono text-sm text-slate-900 dark:text-white">
                    {createdKey.keyPrefix}...
                  </code>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Use this key in your API requests with the Authorization header: <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Bearer YOUR_API_KEY</code>
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button
                onClick={handleSuccess}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
