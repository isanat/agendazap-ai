'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch } from '@/lib/auth-fetch';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Gift,
  Clock,
  DollarSign,
  Percent,
  Calendar,
  CheckCircle,
  XCircle,
  MoreVertical,
  Tag,
  Layers,
  Search,
  LayoutGrid,
  List,
  Users,
  TrendingUp,
  Eye,
  ShoppingCart,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Service {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  category?: string;
}

interface PackageService {
  id: string;
  serviceId: string;
  quantity: number;
  Service: Service;
}

interface PackageData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number;
  discountPercent: number;
  totalSessions: number;
  validityDays: number;
  isActive: boolean;
  packageServices: PackageService[];
  clientsCount: number;
  createdAt: string;
}

export function PackagesPage() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [editingPackage, setEditingPackage] = useState<PackageData | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'clients' | 'created'>('created');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    discountPercent: '',
    totalSessions: '1',
    validityDays: '30',
    isActive: true,
    services: [] as { serviceId: string; quantity: number }[],
  });

  useEffect(() => {
    fetchPackages();
    fetchServices();
  }, [includeInactive]);

  const fetchPackages = async () => {
    try {
      const response = await authFetch(`/api/packages?includeInactive=${includeInactive}`);
      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('Erro ao buscar pacotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await authFetch('/api/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || data);
      }
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      discountPercent: '',
      totalSessions: '1',
      validityDays: '30',
      isActive: true,
      services: [],
    });
    setEditingPackage(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (pkg: PackageData) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price: pkg.price.toString(),
      originalPrice: pkg.originalPrice.toString(),
      discountPercent: pkg.discountPercent.toString(),
      totalSessions: pkg.totalSessions.toString(),
      validityDays: pkg.validityDays.toString(),
      isActive: pkg.isActive,
      services: pkg.packageServices.map((ps) => ({
        serviceId: ps.serviceId,
        quantity: ps.quantity,
      })),
    });
    setDialogOpen(true);
  };

  const openDetailsDialog = (pkg: PackageData) => {
    setSelectedPackage(pkg);
    setDetailsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || formData.services.length === 0) {
      toast({
        title: 'Erro',
        description: 'Preencha nome, preço e selecione pelo menos um serviço',
        variant: 'destructive',
      });
      return;
    }

    try {
      const url = '/api/packages';
      const method = editingPackage ? 'PUT' : 'POST';
      const body = editingPackage
        ? { ...formData, id: editingPackage.id }
        : formData;

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast({
          title: editingPackage ? 'Pacote atualizado!' : 'Pacote criado!',
          description: `O pacote foi ${editingPackage ? 'atualizado' : 'criado'} com sucesso.`,
        });
        setDialogOpen(false);
        resetForm();
        fetchPackages();
      } else {
        const error = await response.json();
        toast({
          title: 'Erro',
          description: error.error || 'Erro ao salvar pacote',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar pacote',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pacote?')) return;

    try {
      const response = await authFetch(`/api/packages?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Pacote excluído!',
          description: 'O pacote foi removido com sucesso.',
        });
        fetchPackages();
      } else {
        const error = await response.json();
        toast({
          title: 'Aviso',
          description: error.message || 'Erro ao excluir pacote',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir pacote',
        variant: 'destructive',
      });
    }
  };

  const toggleService = (serviceId: string) => {
    setFormData((prev) => {
      const existing = prev.services.find((s) => s.serviceId === serviceId);
      if (existing) {
        return {
          ...prev,
          services: prev.services.filter((s) => s.serviceId !== serviceId),
        };
      }
      return {
        ...prev,
        services: [...prev.services, { serviceId, quantity: 1 }],
      };
    });
  };

  const updateServiceQuantity = (serviceId: string, quantity: number) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.serviceId === serviceId ? { ...s, quantity } : s
      ),
    }));
  };

  const calculateOriginalPrice = () => {
    return formData.services.reduce((sum, s) => {
      const service = services.find((svc) => svc.id === s.serviceId);
      return sum + (service?.price || 0) * s.quantity;
    }, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Filter and sort packages
  const filteredPackages = packages
    .filter((pkg) =>
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return a.price - b.price;
        case 'clients':
          return b.clientsCount - a.clientsCount;
        case 'created':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Stats
  const totalPackages = packages.length;
  const activePackages = packages.filter((p) => p.isActive).length;
  const totalClientsWithPackages = packages.reduce((sum, p) => sum + p.clientsCount, 0);
  const totalRevenue = packages.reduce((sum, p) => sum + p.price * p.clientsCount, 0);
  const averageDiscount = packages.length > 0
    ? Math.round(packages.reduce((sum, p) => sum + p.discountPercent, 0) / packages.length)
    : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-6 w-6 text-emerald-500" />
              Pacotes
            </h1>
            <p className="text-muted-foreground">
              Crie e gerencie pacotes de serviços com desconto
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground hidden sm:inline">Mostrar inativos</span>
              <Switch
                checked={includeInactive}
                onCheckedChange={setIncludeInactive}
              />
            </div>
            <Button onClick={openCreateDialog} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
              <Plus className="mr-2 h-4 w-4" />
              Novo Pacote
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Total de Pacotes
                </CardTitle>
                <div className="p-2 rounded-full bg-emerald-500/20">
                  <Package className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {totalPackages}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                    {activePackages} ativos
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Clientes com Pacotes
                </CardTitle>
                <div className="p-2 rounded-full bg-blue-500/20">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {totalClientsWithPackages}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Pacotes vendidos
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Receita em Pacotes
                </CardTitle>
                <div className="p-2 rounded-full bg-amber-500/20">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {formatCurrency(totalRevenue)}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Total vendido
                </p>
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
                  Desconto Médio
                </CardTitle>
                <div className="p-2 rounded-full bg-purple-500/20">
                  <Percent className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {averageDiscount}%
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-purple-500" />
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Economia para clientes
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pacotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Mais recentes</SelectItem>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="price">Preço</SelectItem>
                <SelectItem value="clients">Mais vendidos</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('table')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Packages Grid/Table */}
        {filteredPackages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center bg-gradient-to-b from-muted/50 to-muted/20 rounded-xl border-2 border-dashed"
          >
            <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
              <Package className="h-12 w-12 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum pacote encontrado</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              {searchTerm
                ? 'Tente ajustar sua busca ou filtros'
                : 'Crie pacotes para oferecer descontos especiais aos seus clientes'}
            </p>
            <Button onClick={openCreateDialog} className="bg-gradient-to-r from-emerald-500 to-teal-500">
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Pacote
            </Button>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filteredPackages.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  layout
                >
                  <Card
                    className={`relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer group ${
                      !pkg.isActive ? 'opacity-60' : ''
                    }`}
                    onClick={() => openDetailsDialog(pkg)}
                  >
                    {/* Discount Badge */}
                    {pkg.discountPercent > 0 && (
                      <div className="absolute -right-8 top-4 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-10 py-1 rotate-45 shadow-lg">
                        -{Math.round(pkg.discountPercent)}%
                      </div>
                    )}

                    {/* Popular Badge */}
                    {pkg.clientsCount > 5 && (
                      <div className="absolute left-3 top-3 flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-medium px-2 py-1 rounded-full shadow">
                        <Sparkles className="h-3 w-3" />
                        Popular
                      </div>
                    )}

                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg group-hover:scale-110 transition-transform">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{pkg.name}</CardTitle>
                            <Badge
                              variant={pkg.isActive ? 'default' : 'secondary'}
                              className={`mt-1 ${pkg.isActive ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                            >
                              {pkg.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetailsDialog(pkg); }}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(pkg); }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleDelete(pkg.id); }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {pkg.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {pkg.description}
                        </p>
                      )}

                      {/* Services */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Layers className="h-3 w-3" />
                          <span>Serviços inclusos ({pkg.packageServices.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {pkg.packageServices.slice(0, 3).map((ps) => (
                            <Badge
                              key={ps.id}
                              variant="outline"
                              className="text-xs bg-background/50"
                            >
                              {ps.quantity}x {ps.Service.name}
                            </Badge>
                          ))}
                          {pkg.packageServices.length > 3 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs bg-background/50 cursor-help">
                                  +{pkg.packageServices.length - 3}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {pkg.packageServices.slice(3).map(ps => ps.Service.name).join(', ')}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                          <Clock className="h-3 w-3 text-muted-foreground mb-1" />
                          <span className="font-medium">{pkg.validityDays} dias</span>
                        </div>
                        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                          <Calendar className="h-3 w-3 text-muted-foreground mb-1" />
                          <span className="font-medium">{pkg.totalSessions} sessões</span>
                        </div>
                        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                          <Users className="h-3 w-3 text-muted-foreground mb-1" />
                          <span className="font-medium">{pkg.clientsCount}</span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex items-end justify-between pt-3 border-t">
                        <div>
                          {pkg.originalPrice > pkg.price && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatCurrency(pkg.originalPrice)}
                            </p>
                          )}
                          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(pkg.price)}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => { e.stopPropagation(); openEditDialog(pkg); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pacote</TableHead>
                  <TableHead>Serviços</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Sessões</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPackages.map((pkg) => (
                  <TableRow
                    key={pkg.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetailsDialog(pkg)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{pkg.name}</p>
                          {pkg.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {pkg.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {pkg.packageServices.slice(0, 2).map((ps) => (
                          <Badge key={ps.id} variant="outline" className="text-xs">
                            {ps.Service.name}
                          </Badge>
                        ))}
                        {pkg.packageServices.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{pkg.packageServices.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{pkg.validityDays} dias</TableCell>
                    <TableCell>{pkg.totalSessions}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {pkg.clientsCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {pkg.originalPrice > pkg.price && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatCurrency(pkg.originalPrice)}
                        </p>
                      )}
                      <p className="font-bold text-emerald-600">
                        {formatCurrency(pkg.price)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pkg.isActive ? 'default' : 'secondary'} className={pkg.isActive ? 'bg-emerald-500' : ''}>
                        {pkg.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(pkg); }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleDelete(pkg.id); }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-500" />
                {editingPackage ? 'Editar Pacote' : 'Novo Pacote'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Pacote *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ex: Pacote Noiva"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validity">Validade (dias)</Label>
                  <Input
                    id="validity"
                    type="number"
                    value={formData.validityDays}
                    onChange={(e) =>
                      setFormData({ ...formData, validityDays: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descreva o pacote..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Serviços Inclusos *</Label>
                <div className="grid gap-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/20">
                  {services.map((service) => {
                    const selected = formData.services.find(
                      (s) => s.serviceId === service.id
                    );
                    return (
                      <div
                        key={service.id}
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                          selected ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={!!selected}
                            onCheckedChange={() => toggleService(service.id)}
                          />
                          <div>
                            <p className="text-sm font-medium">{service.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(service.price)} •{' '}
                              {service.durationMinutes} min
                            </p>
                          </div>
                        </div>
                        {selected && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateServiceQuantity(service.id, Math.max(1, selected.quantity - 1))}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center font-medium">{selected.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateServiceQuantity(service.id, selected.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {formData.services.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Valor original:</span>
                    <span className="font-medium">{formatCurrency(calculateOriginalPrice())}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço do Pacote *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="0.00"
                    className="text-lg font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originalPrice">Preço Original</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    value={formData.originalPrice || calculateOriginalPrice()}
                    onChange={(e) =>
                      setFormData({ ...formData, originalPrice: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessions">Total de Sessões</Label>
                  <Input
                    id="sessions"
                    type="number"
                    value={formData.totalSessions}
                    onChange={(e) =>
                      setFormData({ ...formData, totalSessions: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="active" className="cursor-pointer">Pacote ativo para venda</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-emerald-500 to-teal-500">
                {editingPackage ? 'Salvar Alterações' : 'Criar Pacote'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Package Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-500" />
                {selectedPackage?.name}
              </DialogTitle>
            </DialogHeader>

            {selectedPackage && (
              <div className="space-y-6">
                {/* Price Header */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                  <div>
                    <p className="text-sm opacity-80">Preço do pacote</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(selectedPackage.price)}
                    </p>
                    {selectedPackage.originalPrice > selectedPackage.price && (
                      <p className="text-sm opacity-80 line-through">
                        {formatCurrency(selectedPackage.originalPrice)}
                      </p>
                    )}
                  </div>
                  {selectedPackage.discountPercent > 0 && (
                    <div className="text-right">
                      <p className="text-sm opacity-80">Economia</p>
                      <p className="text-2xl font-bold">
                        {Math.round(selectedPackage.discountPercent)}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Services List */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    Serviços Inclusos
                  </h3>
                  <div className="grid gap-2">
                    {selectedPackage.packageServices.map((ps) => (
                      <div
                        key={ps.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-500/10">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-medium">{ps.Service.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {ps.Service.durationMinutes} min
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{ps.quantity}x</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(ps.Service.price * ps.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <Calendar className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xl font-bold">{selectedPackage.validityDays}</p>
                    <p className="text-xs text-muted-foreground">dias de validade</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xl font-bold">{selectedPackage.totalSessions}</p>
                    <p className="text-xs text-muted-foreground">sessões</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xl font-bold">{selectedPackage.clientsCount}</p>
                    <p className="text-xs text-muted-foreground">clientes</p>
                  </div>
                </div>

                {selectedPackage.description && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      {selectedPackage.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                Fechar
              </Button>
              <Button onClick={() => {
                setDetailsDialogOpen(false);
                if (selectedPackage) openEditDialog(selectedPackage);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Pacote
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
