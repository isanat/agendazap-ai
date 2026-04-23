'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch } from '@/lib/auth-fetch';
import {
  Star,
  Gift,
  TrendingUp,
  Users,
  Settings,
  Save,
  Percent,
  Clock,
  Award,
  Sparkles,
  RefreshCw,
  Plus,
  Minus,
  Search,
  History,
  Crown,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LoyaltyProgram {
  id: string;
  name: string;
  pointsPerReal: number;
  redemptionRate: number;
  minimumPoints: number;
  maxDiscountPercent: number;
  pointsExpirationDays: number;
  welcomeBonus: number;
  referralBonus: number;
  isActive: boolean;
}

interface LoyaltyStats {
  totalPoints: number;
  totalTransactions: number;
  totalEarned: number;
  totalRedeemed: number;
  clientsWithPoints: number;
}

interface Transaction {
  id: string;
  clientId: string;
  Client: { name: string };
  points: number;
  type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'referral';
  description: string | null;
  createdAt: string;
  expiryDate: string | null;
}

interface TopClient {
  id: string;
  name: string;
  loyaltyPoints: number;
  totalAppointments: number;
}

export function LoyaltyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [clients, setClients] = useState<TopClient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [adjustPointsDialog, setAdjustPointsDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsType, setPointsType] = useState<'earn' | 'redeem' | 'bonus'>('earn');
  const [pointsDescription, setPointsDescription] = useState('');
  const [adjustingPoints, setAdjustingPoints] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: 'Programa de Fidelidade',
    pointsPerReal: '1',
    redemptionRate: '100',
    minimumPoints: '100',
    maxDiscountPercent: '20',
    pointsExpirationDays: '365',
    welcomeBonus: '0',
    referralBonus: '0',
    isActive: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/loyalty');
      if (response.ok) {
        const data = await response.json();
        setProgram(data.program);
        setStats(data.stats);
        setTransactions(data.transactions || []);
        setTopClients(data.topClients || []);
        if (data.program) {
          setFormData({
            name: data.program.name,
            pointsPerReal: data.program.pointsPerReal.toString(),
            redemptionRate: data.program.redemptionRate.toString(),
            minimumPoints: data.program.minimumPoints.toString(),
            maxDiscountPercent: data.program.maxDiscountPercent.toString(),
            pointsExpirationDays: data.program.pointsExpirationDays.toString(),
            welcomeBonus: data.program.welcomeBonus.toString(),
            referralBonus: data.program.referralBonus.toString(),
            isActive: data.program.isActive,
          });
        } else {
          // No program yet — keep defaults so user can create one
          setFormData({
            name: 'Programa de Fidelidade',
            pointsPerReal: '1',
            redemptionRate: '100',
            minimumPoints: '100',
            maxDiscountPercent: '20',
            pointsExpirationDays: '365',
            welcomeBonus: '0',
            referralBonus: '0',
            isActive: true,
          });
        }
      } else {
        toast.error('Erro ao carregar programa de fidelidade');
      }
    } catch (error) {
      console.error('Erro ao buscar programa:', error);
      toast.error('Erro ao carregar programa de fidelidade');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await authFetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients((data.clients || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          loyaltyPoints: c.loyaltyPoints || 0,
          totalAppointments: c.totalAppointments || 0,
        })));
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await authFetch('/api/loyalty', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setProgram(data);
        toast.success('Programa atualizado! As configurações foram salvas com sucesso.');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar programa');
      }
    } catch (error) {
      toast.error('Erro ao salvar programa');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes} min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earn':
        return <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
      case 'redeem':
        return <ArrowDownRight className="h-4 w-4 text-blue-500" />;
      case 'expire':
        return <Clock className="h-4 w-4 text-red-500" />;
      case 'bonus':
        return <Gift className="h-4 w-4 text-purple-500" />;
      case 'referral':
        return <Users className="h-4 w-4 text-amber-500" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earn':
        return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950';
      case 'redeem':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
      case 'expire':
        return 'text-red-600 bg-red-50 dark:bg-red-950';
      case 'bonus':
        return 'text-purple-600 bg-purple-50 dark:bg-purple-950';
      case 'referral':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-950';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'earn':
        return 'Ganho';
      case 'redeem':
        return 'Resgate';
      case 'expire':
        return 'Expirado';
      case 'bonus':
        return 'Bônus';
      case 'referral':
        return 'Indicação';
      default:
        return type;
    }
  };

  const filteredTransactions = transactions
    .filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (searchTerm && !t.Client.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                <Star className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Programa de Fidelidade
              </h1>
              {program?.isActive && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                  Ativo
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              Configure o programa de pontos e recompensas
            </p>
          </div>
          <Button onClick={() => { setAdjustPointsDialog(true); fetchClients(); }} className="bg-gradient-to-r from-amber-500 to-orange-500">
            <Plus className="mr-2 h-4 w-4" />
            Ajustar Pontos
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
            >
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800 hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Total de Pontos
                  </CardTitle>
                  <div className="p-1.5 rounded-full bg-amber-500/20">
                    <Star className="h-4 w-4 text-amber-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {formatNumber(stats.totalPoints)}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-amber-500" />
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      pontos em circulação
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Pontos Ganhos
                  </CardTitle>
                  <div className="p-1.5 rounded-full bg-emerald-500/20">
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {formatNumber(stats.totalEarned)}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Zap className="h-3 w-3 text-emerald-500" />
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      pontos distribuídos
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Pontos Resgatados
                  </CardTitle>
                  <div className="p-1.5 rounded-full bg-blue-500/20">
                    <Gift className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatNumber(stats.totalRedeemed)}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowDownRight className="h-3 w-3 text-blue-500" />
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      pontos utilizados
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Clientes Ativos
                  </CardTitle>
                  <div className="p-1.5 rounded-full bg-purple-500/20">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {stats.clientsWithPoints}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Crown className="h-3 w-3 text-purple-500" />
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      participantes
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Configuration */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-amber-600" />
                  <CardTitle>Configurações do Programa</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Basic Settings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Configurações Básicas
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Programa</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Programa de Fidelidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="isActive">Status do Programa</Label>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Switch
                          id="isActive"
                          checked={formData.isActive}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, isActive: checked })
                          }
                        />
                        <div className="flex items-center gap-2">
                          {formData.isActive ? (
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                          )}
                          <span className="text-sm">
                            {formData.isActive ? 'Programa ativo' : 'Programa pausado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Points Earning */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Ganho de Pontos
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="pointsPerReal">Pontos por R$1</Label>
                      <div className="relative">
                        <Input
                          id="pointsPerReal"
                          type="number"
                          step="0.1"
                          value={formData.pointsPerReal}
                          onChange={(e) =>
                            setFormData({ ...formData, pointsPerReal: e.target.value })
                          }
                          className="pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          pts/R$
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pontos por cada R$1 gasto
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="welcomeBonus">Bônus de Boas-vindas</Label>
                      <div className="relative">
                        <Input
                          id="welcomeBonus"
                          type="number"
                          value={formData.welcomeBonus}
                          onChange={(e) =>
                            setFormData({ ...formData, welcomeBonus: e.target.value })
                          }
                          className="pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          pts
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ao se cadastrar
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="referralBonus">Bônus por Indicação</Label>
                      <div className="relative">
                        <Input
                          id="referralBonus"
                          type="number"
                          value={formData.referralBonus}
                          onChange={(e) =>
                            setFormData({ ...formData, referralBonus: e.target.value })
                          }
                          className="pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          pts
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Por novo cliente indicado
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Redemption */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Gift className="h-4 w-4 text-blue-500" />
                    Resgate de Pontos
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="redemptionRate">Taxa de Conversão</Label>
                      <div className="relative">
                        <Input
                          id="redemptionRate"
                          type="number"
                          value={formData.redemptionRate}
                          onChange={(e) =>
                            setFormData({ ...formData, redemptionRate: e.target.value })
                          }
                          className="pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          pts = R$1
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pontos para R$1 de desconto
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minimumPoints">Mínimo para Resgate</Label>
                      <div className="relative">
                        <Input
                          id="minimumPoints"
                          type="number"
                          value={formData.minimumPoints}
                          onChange={(e) =>
                            setFormData({ ...formData, minimumPoints: e.target.value })
                          }
                          className="pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          pts
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Mínimo para resgatar
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxDiscountPercent">Desconto Máximo</Label>
                      <div className="relative">
                        <Input
                          id="maxDiscountPercent"
                          type="number"
                          max="100"
                          value={formData.maxDiscountPercent}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxDiscountPercent: e.target.value,
                            })
                          }
                          className="pr-8"
                        />
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Limite por atendimento
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Expiration */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-500" />
                    Expiração de Pontos
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pointsExpirationDays">
                        Validade dos Pontos
                      </Label>
                      <div className="relative">
                        <Input
                          id="pointsExpirationDays"
                          type="number"
                          value={formData.pointsExpirationDays}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              pointsExpirationDays: e.target.value,
                            })
                          }
                          className="pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          dias
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tempo que os pontos permanecem válidos
                      </p>
                    </div>
                  </div>
                </div>

                {/* Example */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 rounded-xl p-4 space-y-3 border border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    Exemplo de Funcionamento
                  </h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/50 dark:bg-black/20">
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                      <span>Cliente gasta <strong>R$100</strong> → Ganha</span>
                      <Badge className="bg-emerald-500">
                        {(100 * parseFloat(formData.pointsPerReal || '0')).toFixed(0)} pontos
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/50 dark:bg-black/20">
                      <Gift className="h-4 w-4 text-blue-500" />
                      <span>Com <strong>{formData.minimumPoints} pts</strong> → Pode resgatar</span>
                      <Badge className="bg-blue-500">
                        {formatCurrency(
                          parseFloat(formData.minimumPoints || '0') /
                            parseFloat(formData.redemptionRate || '1')
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/50 dark:bg-black/20">
                      <Percent className="h-4 w-4 text-purple-500" />
                      <span>Desconto máximo por atendimento:</span>
                      <Badge className="bg-purple-500">
                        {formData.maxDiscountPercent}%
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={fetchData}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-amber-500 to-orange-500">
                    {saving ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Configurações
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Top Clients */}
          <div className="space-y-6">
            {/* Top Clients */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    <CardTitle className="text-base">Top Clientes</CardTitle>
                  </div>
                  <Badge variant="outline">{topClients.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1 px-4">
                    {topClients.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Crown className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum cliente com pontos ainda</p>
                        <p className="text-xs text-muted-foreground mt-1">Os clientes aparecerão aqui conforme acumularem pontos</p>
                      </div>
                    ) : (
                      topClients.map((client, index) => (
                        <motion.div
                          key={client.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm ${
                            index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                            index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                            'bg-muted'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {client.totalAppointments} atendimentos
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            <span className="font-semibold text-amber-600">
                              {formatNumber(client.loyaltyPoints)}
                            </span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm opacity-80">Taxa de Engajamento</p>
                  <p className="text-4xl font-bold">
                    {clients.length > 0 && stats?.clientsWithPoints
                      ? Math.round((stats.clientsWithPoints / clients.length) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs opacity-70">
                    dos clientes participam do programa
                  </p>
                  <Progress 
                    value={clients.length > 0 && stats?.clientsWithPoints
                      ? Math.round((stats.clientsWithPoints / clients.length) * 100)
                      : 0} 
                    className="h-2 bg-white/20 [&>div]:bg-white" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Histórico de Transações</CardTitle>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-48"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filtrar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="earn">Ganhos</SelectItem>
                    <SelectItem value="redeem">Resgates</SelectItem>
                    <SelectItem value="bonus">Bônus</SelectItem>
                    <SelectItem value="referral">Indicações</SelectItem>
                    <SelectItem value="expire">Expirados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Pontos</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <History className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {transactions.length === 0
                              ? 'Nenhuma transação registrada ainda'
                              : 'Nenhuma transação encontrada com os filtros aplicados'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {transactions.length === 0
                              ? 'As transações aparecerão aqui conforme os clientes acumularem ou resgatarem pontos'
                              : 'Tente ajustar os filtros ou a busca'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                  <AnimatePresence>
                    {filteredTransactions.map((transaction, index) => (
                      <motion.tr
                        key={transaction.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.02 }}
                        className="group"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                              {transaction.Client.name[0]}
                            </div>
                            <span className="font-medium">{transaction.Client.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTransactionColor(transaction.type)}>
                            <span className="flex items-center gap-1">
                              {getTransactionIcon(transaction.type)}
                              {getTypeLabel(transaction.type)}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold ${
                            transaction.points > 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {transaction.points > 0 ? '+' : ''}{transaction.points}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {transaction.description || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(transaction.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="text-xs text-muted-foreground">
                            Em breve
                          </Badge>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Adjust Points Dialog */}
        <Dialog open={adjustPointsDialog} onOpenChange={setAdjustPointsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Ajustar Pontos
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({formatNumber(client.loyaltyPoints)} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Ajuste</Label>
                <Select value={pointsType} onValueChange={(v) => setPointsType(v as typeof pointsType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earn">Adicionar (Ganho)</SelectItem>
                    <SelectItem value="redeem">Remover (Resgate)</SelectItem>
                    <SelectItem value="bonus">Bônus Especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantidade de Pontos</Label>
                <Input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input
                  value={pointsDescription}
                  onChange={(e) => setPointsDescription(e.target.value)}
                  placeholder="Ex: Compensação por problema no serviço"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustPointsDialog(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-500"
                disabled={adjustingPoints || !selectedClient || !pointsAmount}
                onClick={async () => {
                  if (!selectedClient || !pointsAmount) return;
                  setAdjustingPoints(true);
                  try {
                    const response = await authFetch('/api/loyalty/points', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        clientId: selectedClient,
                        points: parseInt(pointsAmount),
                        type: pointsType,
                        description: pointsDescription || undefined,
                      }),
                    });
                    if (response.ok) {
                      toast.success('Pontos ajustados com sucesso!');
                      setAdjustPointsDialog(false);
                      setSelectedClient('');
                      setPointsAmount('');
                      setPointsDescription('');
                      fetchData();
                    } else {
                      const error = await response.json();
                      toast.error(error.error || 'Erro ao ajustar pontos');
                    }
                  } catch (error) {
                    toast.error('Erro ao ajustar pontos');
                  } finally {
                    setAdjustingPoints(false);
                  }
                }}
              >
                {adjustingPoints ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Ajustando...
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Ajustar Pontos
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
