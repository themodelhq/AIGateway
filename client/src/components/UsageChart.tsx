import { Card } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface UsageChartProps {
  apiKey?: any;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

export default function UsageChart({ apiKey }: UsageChartProps) {
  const [days, setDays] = useState(30);

  // Fetch daily usage data
  const { data: dailyData = [], isLoading: dailyLoading } = trpc.usage.daily.useQuery(
    apiKey ? { keyId: apiKey.id, days } : { keyId: 0, days },
    { enabled: !!apiKey }
  );

  // Fetch detailed metrics
  const { data: metricsData = [], isLoading: metricsLoading } = trpc.usage.metrics.useQuery(
    apiKey ? { keyId: apiKey.id, days } : { keyId: 0, days },
    { enabled: !!apiKey }
  );

  if (!apiKey) {
    return null;
  }

  // Process data for charts
  const chartData = dailyData.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    requests: item.requestCount || 0,
    tokens: Math.round((item.totalTokens || 0) / 1000), // Convert to thousands
  }));

  // Group metrics by model
  const modelUsage = metricsData.reduce((acc: any, item: any) => {
    const existing = acc.find((m: any) => m.name === item.modelName);
    if (existing) {
      existing.requests += item.requestCount || 0;
      existing.tokens += item.totalTokens || 0;
    } else {
      acc.push({
        name: item.modelName,
        requests: item.requestCount || 0,
        tokens: item.totalTokens || 0,
      });
    }
    return acc;
  }, []);

  // Calculate totals
  const totalRequests = chartData.reduce((sum, item) => sum + item.requests, 0);
  const totalTokens = chartData.reduce((sum, item) => sum + item.tokens, 0) * 1000;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-premium">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Requests</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalRequests.toLocaleString()}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Last {days} days</p>
        </Card>

        <Card className="card-premium">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Tokens</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{(totalTokens / 1000000).toFixed(2)}M</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Last {days} days</p>
        </Card>

        <Card className="card-premium">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Avg Requests/Day</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{Math.round(totalRequests / days)}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Last {days} days</p>
        </Card>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <Button
            key={d}
            variant={days === d ? "default" : "outline"}
            size="sm"
            onClick={() => setDays(d)}
            className={days === d ? "bg-blue-600 text-white" : ""}
          >
            {d} days
          </Button>
        ))}
      </div>

      {/* Charts */}
      {dailyLoading ? (
        <Card className="card-premium text-center py-12">
          <p className="text-slate-600 dark:text-slate-400">Loading usage data...</p>
        </Card>
      ) : chartData.length === 0 ? (
        <Card className="card-premium text-center py-12">
          <p className="text-slate-600 dark:text-slate-400">No usage data available yet</p>
        </Card>
      ) : (
        <>
          {/* Requests Over Time */}
          <Card className="card-premium">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Requests Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Token Usage */}
          <Card className="card-premium">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Token Usage Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Legend />
                <Bar dataKey="tokens" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Model Usage Distribution */}
          {modelUsage.length > 0 && (
            <Card className="card-premium">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Usage by Model</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Requests by Model</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={modelUsage}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, requests }) => `${name}: ${requests}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="requests"
                      >
                        {modelUsage.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Model Details</h4>
                  <div className="space-y-3">
                    {modelUsage.map((model: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{model.name}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {(model.tokens / 1000000).toFixed(2)}M tokens
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {model.requests.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
