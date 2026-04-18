import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Send, Trash2, Copy, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function Playground() {
  const { isAuthenticated } = useAuth();
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);

  // Fetch models
  const { data: models = [] } = trpc.models.list.useQuery();

  // Fetch API keys
  const { data: apiKeys = [] } = trpc.apiKeys.list.useQuery(undefined, { enabled: isAuthenticated });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Card className="card-premium text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Sign In Required</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You need to sign in to access the AI Playground
          </p>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
              Go Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedModel) {
      toast.error("Please select a model and enter a message");
      return;
    }

    if (apiKeys.length === 0) {
      toast.error("Please create an API key first");
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Simulate API call - in production, this would call your gateway
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "This is a simulated response. In production, this would call the actual AI model through the gateway API.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Message copied to clipboard");
  };

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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Playground</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Settings Panel */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto">
            <Card className="card-premium">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Model Settings</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                    Select Model
                  </label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id.toString()}>
                          <div>
                            <p className="font-medium">{model.name}</p>
                            <p className="text-xs text-slate-500">{model.provider}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                    Temperature: {temperature.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>

                <div>
                  <label htmlFor="maxTokens" className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                    Max Tokens
                  </label>
                  <Input
                    id="maxTokens"
                    type="number"
                    min="1"
                    max="4000"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2000)}
                  />
                </div>

                <div>
                  <label htmlFor="systemPrompt" className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                    System Prompt
                  </label>
                  <Textarea
                    id="systemPrompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="resize-none"
                    rows={4}
                  />
                </div>

                <Button
                  onClick={clearMessages}
                  variant="outline"
                  className="w-full gap-2"
                  disabled={messages.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Chat
                </Button>
              </div>
            </Card>

            {/* API Key Info */}
            <Card className="card-premium">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">API Key</h3>
              {apiKeys.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Using key: <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs">
                      {apiKeys[0].keyPrefix}...
                    </code>
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {apiKeys.length} key{apiKeys.length !== 1 ? "s" : ""} available
                  </p>
                </div>
              ) : (
                <Link href="/dashboard">
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Create API Key
                  </Button>
                </Link>
              )}
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 flex flex-col">
            <Card className="card-premium flex-grow flex flex-col">
              {/* Messages */}
              <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-slate-600 dark:text-slate-400 mb-2">
                        {selectedModel ? "Start a conversation" : "Select a model to begin"}
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                          {message.role === "assistant" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyMessage(message.content)}
                              className="p-0 h-auto opacity-70 hover:opacity-100"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) {
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your message... (Ctrl+Enter to send)"
                  className="resize-none"
                  rows={3}
                  disabled={isLoading || !selectedModel}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !selectedModel || !input.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white self-end gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
