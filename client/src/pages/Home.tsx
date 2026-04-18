import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Zap, Lock, BarChart3, Sparkles, Code2, Rocket } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  const providers = [
    { name: "OpenAI", icon: "🤖", models: "GPT-4, GPT-3.5" },
    { name: "Anthropic", icon: "🧠", models: "Claude 3, Claude 2" },
    { name: "Google Gemini", icon: "✨", models: "Gemini Pro, Gemini Ultra" },
    { name: "Mistral", icon: "⚡", models: "Mistral 7B, Mistral Large" },
    { name: "Meta LLaMA", icon: "🦙", models: "LLaMA 2, LLaMA 3" },
  ];

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Unified API",
      description: "Access all major AI providers through a single, consistent API endpoint",
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Secure Key Management",
      description: "Generate, manage, and revoke API keys with granular rate limiting controls",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Usage Analytics",
      description: "Track requests, tokens, costs, and performance metrics in real-time",
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "AI Playground",
      description: "Test any model interactively before integrating into your application",
    },
    {
      icon: <Code2 className="w-6 h-6" />,
      title: "Developer Friendly",
      description: "Comprehensive documentation and SDKs for seamless integration",
    },
    {
      icon: <Rocket className="w-6 h-6" />,
      title: "Production Ready",
      description: "Enterprise-grade infrastructure with 99.9% uptime guarantee",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 dark:from-slate-950 dark:via-blue-950 dark:to-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">AI Gateway</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <span className="text-sm text-slate-600 dark:text-slate-400">Welcome, {user?.name}</span>
              </>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Sign In</Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tight">
              Unified Access to <span className="text-gradient">All AI Models</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Connect to OpenAI, Anthropic, Google Gemini, Mistral, Meta LLaMA and more through a single, elegant API gateway. Manage keys, track usage, and test models—all in one place.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    Go to Dashboard <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/playground">
                  <Button size="lg" variant="outline">
                    Try Playground
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <a href={getLoginUrl()}>
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    Get Started Free <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
                <a href="#features">
                  <Button size="lg" variant="outline">
                    Learn More
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Supported Providers */}
      <section className="container py-20 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Supported AI Providers</h2>
          <p className="text-slate-600 dark:text-slate-400">Access cutting-edge models from industry leaders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {providers.map((provider) => (
            <Card key={provider.name} className="card-premium text-center hover:shadow-lg transition-all duration-200">
              <div className="text-4xl mb-3">{provider.icon}</div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{provider.name}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{provider.models}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Powerful Features</h2>
          <p className="text-slate-600 dark:text-slate-400">Everything you need to build with AI</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <Card key={idx} className="card-premium hover:shadow-lg transition-all duration-200">
              <div className="text-blue-600 dark:text-blue-400 mb-4">{feature.icon}</div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Start Guide */}
      <section className="container py-20 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12 text-center">Quick Start Guide</h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-6 animate-slide-in-up">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-600 text-white font-semibold">
                  1
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Create an Account</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Sign in with your credentials to access the AI Gateway platform. It takes less than a minute.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-600 text-white font-semibold">
                  2
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Generate an API Key</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Create a new API key from your dashboard. You can create multiple keys for different applications.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-600 text-white font-semibold">
                  3
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Test in Playground</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Use the interactive playground to test any model before integrating it into your application.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-6 animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-600 text-white font-semibold">
                  4
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Integrate & Deploy</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Use your API key to make requests to any supported AI model. Monitor usage and costs in real-time.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Example API Call</h4>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded text-sm overflow-x-auto">
{`curl https://api.aigateway.com/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`}
            </pre>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto text-center space-y-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold">Ready to Build with AI?</h2>
          <p className="text-blue-100">
            Join developers worldwide who are building amazing applications with the AI Gateway platform.
          </p>
          {!isAuthenticated && (
            <a href={getLoginUrl()}>
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 gap-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Models</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Developers</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">API Reference</a></li>
                <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">SDKs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">© 2026 AI Gateway. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Twitter</a>
              <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">GitHub</a>
              <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Discord</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
