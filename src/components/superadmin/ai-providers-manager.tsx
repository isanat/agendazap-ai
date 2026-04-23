'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle, Cpu, Plus, RefreshCw, Settings, Trash2, Zap, Activity, DollarSign, BarChart3 } from 'lucide-react';
import { authFetch, authGet } from '@/lib/auth-fetch';

interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  apiKey?: string;
  hasApiKey?: boolean;
  baseUrl?: string | null;
  model: string;
  priority: number;
  isEnabled: boolean;
  costPerInputToken: number;
  costPerOutputToken: number;
  rateLimitPerMinute: number;
  maxTokensPerRequest: number;
  healthStatus: string;
  totalRequests: number;
  totalErrors: number;
  stats?: {
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  };
}

interface UsageStats {
  overall: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  };
  byProvider: Array<{
    provider: string;
    displayName: string;
    totalTokens: number;
    cost: number;
    requestCount: number;
  }>;
  byAccount: Array<{
    accountId: string;
    businessName: string;
    totalTokens: number;
    cost: number;
    requestCount: number;
  }>;
  dailyUsage: Array<{
    date: string;
    tokens: number;
    cost: number;
  }>;
}

// Provider presets for quick setup
const PROVIDER_PRESETS = [
  {
    name: 'groq',
    displayName: 'Groq (Llama)',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    costPerInputToken: 0.000059, // $0.059 per 1M tokens
    costPerOutputToken: 0.000079, // $0.079 per 1M tokens
  },
  {
    name: 'zai',
    displayName: 'Z.ai (Built-in)',
    baseUrl: null,
    model: 'default',
    costPerInputToken: 0,
    costPerOutputToken: 0,
  },
  {
    name: 'openai',
    displayName: 'OpenAI (GPT-4o-mini)',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    costPerInputToken: 0.00015, // $0.15 per 1M tokens
    costPerOutputToken: 0.0006, // $0.60 per 1M tokens
  },
  {
    name: 'openai',
    displayName: 'OpenAI (GPT-4o)',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    costPerInputToken: 0.0025, // $2.50 per 1M tokens
    costPerOutputToken: 0.01, // $10.00 per 1M tokens
  },
  {
    name: 'anthropic',
    displayName: 'Anthropic (Claude Haiku)',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-haiku-20240307',
    costPerInputToken: 0.00025, // $0.25 per 1M tokens
    costPerOutputToken: 0.00125, // $1.25 per 1M tokens
  },
];

export function AIProvidersManager() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthChecking, setHealthChecking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    apiKey: '',
    baseUrl: '',
    model: '',
    priority: 0,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    rateLimitPerMinute: 60,
    maxTokensPerRequest: 4096,
  });

  useEffect(() => {
    fetchProviders();
    fetchUsageStats();
  }, []);

  async function fetchProviders() {
    try {
      const res = await authGet('/api/admin/ai-providers?stats=true');
      const data = await res.json();
      setProviders(data.providers || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsageStats() {
    try {
      const res = await authGet('/api/admin/ai-usage');
      const data = await res.json();
      setUsageStats(data);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  }

  async function checkHealth() {
    setHealthChecking(true);
    try {
      const res = await authGet('/api/admin/ai-health');
      const data = await res.json();
      if (data.success) {
        await fetchProviders();
      }
    } catch (error) {
      console.error('Error checking health:', error);
    } finally {
      setHealthChecking(false);
    }
  }

  async function toggleProvider(id: string, enabled: boolean) {
    try {
      await authFetch('/api/admin/ai-providers', {
        method: 'PUT',
        body: { id, isEnabled: enabled },
      });
      await fetchProviders();
    } catch (error) {
      console.error('Error toggling provider:', error);
    }
  }

  async function deleteProvider(id: string) {
    if (!confirm('Tem certeza que deseja excluir este provider?')) return;
    
    try {
      await authFetch(`/api/admin/ai-providers?id=${id}`, { method: 'DELETE' });
      await fetchProviders();
    } catch (error) {
      console.error('Error deleting provider:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      if (editingProvider) {
        // When editing, only send apiKey if it was changed (not empty)
        const dataToSend = { id: editingProvider.id, ...formData };
        if (!dataToSend.apiKey || dataToSend.apiKey.trim() === '') {
          delete (dataToSend as Record<string, unknown>).apiKey;
        }
        await authFetch('/api/admin/ai-providers', {
          method: 'PUT',
          body: dataToSend,
        });
      } else {
        await authFetch('/api/admin/ai-providers', {
          method: 'POST',
          body: formData,
        });
      }
      
      setDialogOpen(false);
      setEditingProvider(null);
      resetForm();
      await fetchProviders();
    } catch (error) {
      console.error('Error saving provider:', error);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      displayName: '',
      apiKey: '',
      baseUrl: '',
      model: '',
      priority: providers.length,
      costPerInputToken: 0,
      costPerOutputToken: 0,
      rateLimitPerMinute: 60,
      maxTokensPerRequest: 4096,
    });
  }

  function applyPreset(preset: typeof PROVIDER_PRESETS[0]) {
    setFormData({
      ...formData,
      name: preset.name,
      displayName: preset.displayName,
      baseUrl: preset.baseUrl || '',
      model: preset.model,
      costPerInputToken: preset.costPerInputToken,
      costPerOutputToken: preset.costPerOutputToken,
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" /> Degraded</Badge>;
      case 'down':
        return <Badge className="bg-red-500"><AlertCircle className="w-3 h-3 mr-1" /> Down</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers">
            <Cpu className="w-4 h-4 mr-2" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="usage">
            <BarChart3 className="w-4 h-4 mr-2" />
            Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">AI Providers</h2>
              <p className="text-muted-foreground">
                Configure multiple AI providers with automatic fallback
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={checkHealth} disabled={healthChecking}>
                <Activity className="w-4 h-4 mr-2" />
                {healthChecking ? 'Checking...' : 'Health Check'}
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setEditingProvider(null); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Provider
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingProvider ? 'Edit Provider' : 'Add AI Provider'}</DialogTitle>
                    <DialogDescription>
                      Configure a new AI provider for the fallback chain
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Presets */}
                    <div>
                      <Label>Quick Presets</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {PROVIDER_PRESETS.map(preset => (
                          <Button
                            key={preset.displayName}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => applyPreset(preset)}
                          >
                            {preset.displayName}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Provider Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          placeholder="groq, openai, anthropic, zai"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          value={formData.displayName}
                          onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                          placeholder="Groq (Llama)"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="apiKey">
                        API Key
                        {editingProvider?.hasApiKey && (
                          <span className="ml-2 text-green-600 text-xs">
                            ✓ Current: {editingProvider.apiKey}
                          </span>
                        )}
                      </Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={formData.apiKey}
                        onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                        placeholder={editingProvider?.hasApiKey 
                          ? "Leave empty to keep current key" 
                          : "sk-..."}
                        required={!editingProvider}
                      />
                      {editingProvider?.hasApiKey && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Leave empty to keep the current API key
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="baseUrl">Base URL (optional)</Label>
                        <Input
                          id="baseUrl"
                          value={formData.baseUrl}
                          onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="model">Model</Label>
                        <Input
                          id="model"
                          value={formData.model}
                          onChange={e => setFormData({ ...formData, model: e.target.value })}
                          placeholder="gpt-4o-mini"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="priority">Priority (lower = first)</Label>
                        <Input
                          id="priority"
                          type="number"
                          value={formData.priority}
                          onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="rateLimit">Rate Limit/min</Label>
                        <Input
                          id="rateLimit"
                          type="number"
                          value={formData.rateLimitPerMinute}
                          onChange={e => setFormData({ ...formData, rateLimitPerMinute: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxTokens">Max Tokens</Label>
                        <Input
                          id="maxTokens"
                          type="number"
                          value={formData.maxTokensPerRequest}
                          onChange={e => setFormData({ ...formData, maxTokensPerRequest: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="costInput">Cost per 1K Input ($)</Label>
                        <Input
                          id="costInput"
                          type="number"
                          step="0.000001"
                          value={formData.costPerInputToken}
                          onChange={e => setFormData({ ...formData, costPerInputToken: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="costOutput">Cost per 1K Output ($)</Label>
                        <Input
                          id="costOutput"
                          type="number"
                          step="0.000001"
                          value={formData.costPerOutputToken}
                          onChange={e => setFormData({ ...formData, costPerOutputToken: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingProvider ? 'Update' : 'Add Provider'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Providers List */}
          <div className="grid gap-4">
            {providers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Cpu className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No AI Providers Configured</h3>
                  <p className="text-muted-foreground text-center mt-2">
                    Add your first AI provider to enable the intelligent assistant feature.
                    <br />You can add multiple providers for automatic fallback.
                  </p>
                </CardContent>
              </Card>
            ) : (
              providers.map((provider) => (
                <Card key={provider.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{provider.displayName}</CardTitle>
                          <CardDescription>
                            {provider.name} • {provider.model}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(provider.healthStatus)}
                        <Switch
                          checked={provider.isEnabled}
                          onCheckedChange={(checked) => toggleProvider(provider.id, checked)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Priority</p>
                        <p className="text-lg font-semibold">{provider.priority}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Requests</p>
                        <p className="text-lg font-semibold">{provider.totalRequests.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Errors</p>
                        <p className="text-lg font-semibold text-red-500">{provider.totalErrors}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cost/1K tokens</p>
                        <p className="text-lg font-semibold">
                          ${(provider.costPerInputToken + provider.costPerOutputToken).toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">API Key</p>
                        <div className="flex items-center gap-2">
                          {provider.hasApiKey ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-mono">{provider.apiKey}</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <span className="text-sm text-amber-600">Not configured</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {provider.stats && (
                      <div className="bg-muted/50 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Usage</span>
                          <span className="font-semibold">{provider.stats.totalTokens.toLocaleString()} tokens</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Cost</span>
                          <span className="font-semibold">${provider.stats.totalCost.toFixed(4)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingProvider(provider);
                          setFormData({
                            name: provider.name,
                            displayName: provider.displayName,
                            apiKey: '', // Don't show current API key for security
                            baseUrl: provider.baseUrl || '',
                            model: provider.model,
                            priority: provider.priority,
                            costPerInputToken: provider.costPerInputToken,
                            costPerOutputToken: provider.costPerOutputToken,
                            rateLimitPerMinute: provider.rateLimitPerMinute,
                            maxTokensPerRequest: provider.maxTokensPerRequest,
                          });
                          setDialogOpen(true);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500"
                        onClick={() => deleteProvider(provider.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          {/* Usage Overview */}
          {usageStats && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Requests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{usageStats.overall.requestCount.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Tokens</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{usageStats.overall.totalTokens.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Input Tokens</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{usageStats.overall.inputTokens.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Cost</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">${usageStats.overall.totalCost.toFixed(4)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* By Provider */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage by Provider</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {usageStats.byProvider.map((p) => (
                      <div key={p.provider} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="font-medium">{p.displayName}</span>
                        <div className="flex items-center gap-4">
                          <span>{p.totalTokens.toLocaleString()} tokens</span>
                          <span>${p.cost.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* By Account */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Accounts by Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {usageStats.byAccount.map((a) => (
                      <div key={a.accountId} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="font-medium">{a.businessName}</span>
                        <div className="flex items-center gap-4">
                          <span>{a.totalTokens.toLocaleString()} tokens</span>
                          <span>${a.cost.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
