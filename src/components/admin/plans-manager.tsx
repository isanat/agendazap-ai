'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, Edit2, Trash2, Save, X, Check, 
  Users, Calendar, MessageSquare, Bot, CreditCard, 
  FileText, Globe, Headphones, Star, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authFetch, authGet } from '@/lib/auth-fetch';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxProfessionals: number;
  maxServices: number;
  maxAppointmentsMonth: number;
  maxClients: number;
  includeWhatsApp: boolean;
  includeAiAssistant: boolean;
  includeGoogleCalendar: boolean;
  includeMercadoPago: boolean;
  includeNfsE: boolean;
  includeReports: boolean;
  includeCustomDomain: boolean;
  includePrioritySupport: boolean;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  _count?: { subscriptions: number };
}

const defaultPlanData: Partial<Plan> = {
  name: '',
  displayName: '',
  description: '',
  priceMonthly: 0,
  priceYearly: 0,
  maxProfessionals: 1,
  maxServices: 10,
  maxAppointmentsMonth: 100,
  maxClients: 500,
  includeWhatsApp: true,
  includeAiAssistant: false,
  includeGoogleCalendar: false,
  includeMercadoPago: true,
  includeNfsE: false,
  includeReports: true,
  includeCustomDomain: false,
  includePrioritySupport: false,
  isActive: true,
  isPopular: false,
  sortOrder: 0,
};

// Demo plans for when API is not available (demo mode)
const demoPlans: Plan[] = [
  {
    id: 'demo-basic',
    name: 'basic',
    displayName: 'Básico',
    description: 'Ideal para profissionais autônomos',
    priceMonthly: 49.90,
    priceYearly: 478.80,
    maxProfessionals: 1,
    maxServices: 10,
    maxAppointmentsMonth: 100,
    maxClients: 500,
    includeWhatsApp: true,
    includeAiAssistant: false,
    includeGoogleCalendar: false,
    includeMercadoPago: true,
    includeNfsE: false,
    includeReports: true,
    includeCustomDomain: false,
    includePrioritySupport: false,
    isActive: true,
    isPopular: false,
    sortOrder: 1,
  },
  {
    id: 'demo-professional',
    name: 'professional',
    displayName: 'Profissional',
    description: 'Perfeito para pequenos negócios',
    priceMonthly: 99.90,
    priceYearly: 958.80,
    maxProfessionals: 3,
    maxServices: 25,
    maxAppointmentsMonth: 300,
    maxClients: 1500,
    includeWhatsApp: true,
    includeAiAssistant: true,
    includeGoogleCalendar: true,
    includeMercadoPago: true,
    includeNfsE: false,
    includeReports: true,
    includeCustomDomain: false,
    includePrioritySupport: false,
    isActive: true,
    isPopular: true,
    sortOrder: 2,
  },
  {
    id: 'demo-salon',
    name: 'salon',
    displayName: 'Salão',
    description: 'Para salões e clínicas de beleza',
    priceMonthly: 199.90,
    priceYearly: 1918.80,
    maxProfessionals: 10,
    maxServices: 50,
    maxAppointmentsMonth: 1000,
    maxClients: 5000,
    includeWhatsApp: true,
    includeAiAssistant: true,
    includeGoogleCalendar: true,
    includeMercadoPago: true,
    includeNfsE: true,
    includeReports: true,
    includeCustomDomain: true,
    includePrioritySupport: true,
    isActive: true,
    isPopular: false,
    sortOrder: 3,
  },
  {
    id: 'demo-enterprise',
    name: 'enterprise',
    displayName: 'Empresa',
    description: 'Solução completa para redes e franquias',
    priceMonthly: 399.90,
    priceYearly: 3838.80,
    maxProfessionals: 50,
    maxServices: 200,
    maxAppointmentsMonth: 10000,
    maxClients: 50000,
    includeWhatsApp: true,
    includeAiAssistant: true,
    includeGoogleCalendar: true,
    includeMercadoPago: true,
    includeNfsE: true,
    includeReports: true,
    includeCustomDomain: true,
    includePrioritySupport: true,
    isActive: true,
    isPopular: false,
    sortOrder: 4,
  },
];

export function PlansManager() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Plan>>(defaultPlanData);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await authGet('/api/admin/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
      } else {
        // Use demo plans when API returns error (e.g., 401 in demo mode)
        console.log('API not available, using demo plans');
        setPlans(demoPlans);
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      // Use demo plans when API fails
      setPlans(demoPlans);
      toast({
        title: 'Modo Demo',
        description: 'Exibindo planos de demonstração',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = '/api/admin/plans';
      const method = editingPlan ? 'PUT' : 'POST';
      const body = editingPlan ? { id: editingPlan.id, ...formData } : formData;

      const response = await authFetch(url, {
        method,
        body,
      });

      if (response.ok) {
        toast({
          title: 'Sucesso!',
          description: editingPlan ? 'Plano atualizado' : 'Plano criado',
        });
        setIsDialogOpen(false);
        setEditingPlan(null);
        setFormData(defaultPlanData);
        loadPlans();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível salvar',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData(plan);
    setIsDialogOpen(true);
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Tem certeza que deseja excluir o plano "${plan.displayName}"?`)) return;

    try {
      const response = await authFetch(`/api/admin/plans?id=${plan.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({ title: 'Sucesso!', description: 'Plano excluído' });
        loadPlans();
      } else {
        const data = await response.json();
        throw new Error(data.message || data.error);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível excluir',
        variant: 'destructive',
      });
    }
  };

  const togglePlanStatus = async (plan: Plan) => {
    try {
      const response = await authFetch('/api/admin/plans', {
        method: 'PUT',
        body: { id: plan.id, isActive: !plan.isActive },
      });

      if (response.ok) {
        toast({
          title: 'Sucesso!',
          description: `Plano ${!plan.isActive ? 'ativado' : 'desativado'}`,
        });
        loadPlans();
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o plano',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Planos de Assinatura</h2>
          <p className="text-muted-foreground">
            Gerencie os planos disponíveis para seus clientes
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingPlan(null);
            setFormData(defaultPlanData);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence>
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`relative ${plan.isPopular ? 'border-green-500 border-2' : ''} ${!plan.isActive ? 'opacity-60' : ''}`}>
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-green-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.displayName}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(plan)}
                        disabled={!!plan._count?.subscriptions && plan._count.subscriptions > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{plan.description || plan.name}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Preços */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      R$ {plan.priceMonthly.toFixed(2).replace('.', ',')}
                    </div>
                    <p className="text-sm text-muted-foreground">/mês</p>
                    {plan.priceYearly > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ou R$ {plan.priceYearly.toFixed(2).replace('.', ',')}/ano
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Switch
                      checked={plan.isActive}
                      onCheckedChange={() => togglePlanStatus(plan)}
                    />
                  </div>

                  {/* Limites */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{plan.maxProfessionals} profissionais</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{plan.maxServices} serviços</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{plan.maxAppointmentsMonth} agendamentos/mês</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1">
                    {plan.includeWhatsApp && (
                      <Badge variant="secondary" className="text-xs">
                        <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
                      </Badge>
                    )}
                    {plan.includeAiAssistant && (
                      <Badge variant="secondary" className="text-xs">
                        <Bot className="h-3 w-3 mr-1" /> IA
                      </Badge>
                    )}
                    {plan.includeGoogleCalendar && (
                      <Badge variant="secondary" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" /> Google
                      </Badge>
                    )}
                    {plan.includeMercadoPago && (
                      <Badge variant="secondary" className="text-xs">
                        <CreditCard className="h-3 w-3 mr-1" /> PIX
                      </Badge>
                    )}
                  </div>

                  {/* Assinaturas */}
                  {plan._count && (
                    <div className="text-xs text-muted-foreground text-center">
                      {plan._count.subscriptions} assinaturas ativas
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Dialog de Edição/Criação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes e limites do plano
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                Informações Básicas
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome (identificador)</Label>
                  <Input
                    id="name"
                    placeholder="basic, pro, salon..."
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!!editingPlan}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nome de Exibição</Label>
                  <Input
                    id="displayName"
                    placeholder="Básico, Profissional..."
                    value={formData.displayName || ''}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição do plano..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            {/* Preços */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Preços
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priceMonthly">Preço Mensal (R$)</Label>
                  <Input
                    id="priceMonthly"
                    type="number"
                    step="0.01"
                    value={formData.priceMonthly || 0}
                    onChange={(e) => setFormData({ ...formData, priceMonthly: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceYearly">Preço Anual (R$)</Label>
                  <Input
                    id="priceYearly"
                    type="number"
                    step="0.01"
                    value={formData.priceYearly || 0}
                    onChange={(e) => setFormData({ ...formData, priceYearly: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Limites */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Limites
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxProfessionals">Máx. Profissionais</Label>
                  <Input
                    id="maxProfessionals"
                    type="number"
                    value={formData.maxProfessionals || 1}
                    onChange={(e) => setFormData({ ...formData, maxProfessionals: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxServices">Máx. Serviços</Label>
                  <Input
                    id="maxServices"
                    type="number"
                    value={formData.maxServices || 10}
                    onChange={(e) => setFormData({ ...formData, maxServices: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAppointmentsMonth">Máx. Agendamentos/Mês</Label>
                  <Input
                    id="maxAppointmentsMonth"
                    type="number"
                    value={formData.maxAppointmentsMonth || 100}
                    onChange={(e) => setFormData({ ...formData, maxAppointmentsMonth: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxClients">Máx. Clientes</Label>
                  <Input
                    id="maxClients"
                    type="number"
                    value={formData.maxClients || 500}
                    onChange={(e) => setFormData({ ...formData, maxClients: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Check className="h-4 w-4" />
                Features Inclusas
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    <span className="text-sm">WhatsApp</span>
                  </div>
                  <Switch
                    checked={formData.includeWhatsApp ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeWhatsApp: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Assistente IA</span>
                  </div>
                  <Switch
                    checked={formData.includeAiAssistant ?? false}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeAiAssistant: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Google Calendar</span>
                  </div>
                  <Switch
                    checked={formData.includeGoogleCalendar ?? false}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeGoogleCalendar: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Mercado Pago</span>
                  </div>
                  <Switch
                    checked={formData.includeMercadoPago ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeMercadoPago: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">NFS-e</span>
                  </div>
                  <Switch
                    checked={formData.includeNfsE ?? false}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeNfsE: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-cyan-500" />
                    <span className="text-sm">Relatórios</span>
                  </div>
                  <Switch
                    checked={formData.includeReports ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeReports: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-pink-500" />
                    <span className="text-sm">Domínio Personalizado</span>
                  </div>
                  <Switch
                    checked={formData.includeCustomDomain ?? false}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeCustomDomain: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Headphones className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Suporte Prioritário</span>
                  </div>
                  <Switch
                    checked={formData.includePrioritySupport ?? false}
                    onCheckedChange={(checked) => setFormData({ ...formData, includePrioritySupport: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h4 className="font-semibold">Status</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Plano Ativo</span>
                  <Switch
                    checked={formData.isActive ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Destacar como Popular</span>
                  <Switch
                    checked={formData.isPopular ?? false}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPopular: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder">Ordem de Exibição</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder || 0}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
