'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { authFetch } from '@/lib/auth-fetch'
import { 
  Building2, Instagram, Facebook, Globe, MapPin, 
  Save, Loader2, ExternalLink, Image, FileText,
  Navigation, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface BusinessInfo {
  businessName: string
  businessType: string
  instagram: string
  facebook: string
  website: string
  description: string
  address: string
  addressCity: string
  addressState: string
  addressZipCode: string
  addressComplement: string
  googleMapsUrl: string
}

export function BusinessInfoSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [info, setInfo] = useState<BusinessInfo>({
    businessName: '',
    businessType: 'salon',
    instagram: '',
    facebook: '',
    website: '',
    description: '',
    address: '',
    addressCity: '',
    addressState: '',
    addressZipCode: '',
    addressComplement: '',
    googleMapsUrl: ''
  })

  useEffect(() => {
    loadBusinessInfo()
  }, [])

  const loadBusinessInfo = async () => {
    try {
      const response = await authFetch('/api/account/me')
      if (response.ok) {
        const data = await response.json()
        const account = data.account || data.Account
        if (account) {
          setInfo({
            businessName: account.businessName || '',
            businessType: account.businessType || 'salon',
            instagram: account.instagram || '',
            facebook: account.facebook || '',
            website: account.website || '',
            description: account.description || '',
            address: account.address || '',
            addressCity: account.addressCity || '',
            addressState: account.addressState || '',
            addressZipCode: account.addressZipCode || '',
            addressComplement: account.addressComplement || '',
            googleMapsUrl: account.googleMapsUrl || ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading business info:', error)
      toast.error('Erro ao carregar informações')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await authFetch('/api/account/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info)
      })

      if (response.ok) {
        toast.success('Informações salvas com sucesso!')
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('Error saving business info:', error)
      toast.error('Erro ao salvar informações')
    } finally {
      setIsSaving(false)
    }
  }

  const generateGoogleMapsUrl = () => {
    if (info.address && info.addressCity) {
      const query = encodeURIComponent(`${info.address}, ${info.addressCity}${info.addressState ? `, ${info.addressState}` : ''}`)
      setInfo(prev => ({
        ...prev,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${query}`
      }))
      toast.success('Link do Google Maps gerado!')
    } else {
      toast.error('Preencha o endereço e a cidade primeiro')
    }
  }

  const formatInstagram = (value: string) => {
    // Remove @ if user types it, we'll add it automatically
    const clean = value.replace(/^@/, '')
    return clean
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Redes Sociais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Instagram className="w-5 h-5 text-purple-500" />
            </div>
            Redes Sociais
          </CardTitle>
          <CardDescription>
            Essas informações serão usadas pela IA Luna para sugerir aos clientes que não conhecem seu estabelecimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-500" />
                Instagram
              </Label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md text-muted-foreground">@</span>
                <Input
                  id="instagram"
                  placeholder="seusalao"
                  value={info.instagram}
                  onChange={(e) => setInfo(prev => ({ ...prev, instagram: formatInstagram(e.target.value) }))}
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A IA vai sugerir: "Visite nosso Instagram: @seusalao"
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook" className="flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-500" />
                Facebook
              </Label>
              <Input
                id="facebook"
                placeholder="https://facebook.com/seusalao"
                value={info.facebook}
                onChange={(e) => setInfo(prev => ({ ...prev, facebook: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-green-500" />
              Website
            </Label>
            <Input
              id="website"
              placeholder="https://seusite.com.br"
              value={info.website}
              onChange={(e) => setInfo(prev => ({ ...prev, website: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              Descrição do Negócio
            </Label>
            <Textarea
              id="description"
              placeholder="Descreva seu estabelecimento, especialidades, diferenciais..."
              value={info.description}
              onChange={(e) => setInfo(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              A IA usará essa descrição para responder perguntas sobre seu negócio
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
              <MapPin className="w-5 h-5 text-green-500" />
            </div>
            Endereço
          </CardTitle>
          <CardDescription>
            Quando o cliente pedir o endereço, a IA enviará o endereço completo com link do Google Maps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              placeholder="Rua das Flores, 123 - Centro"
              value={info.address}
              onChange={(e) => setInfo(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="addressCity">Cidade</Label>
              <Input
                id="addressCity"
                placeholder="São Paulo"
                value={info.addressCity}
                onChange={(e) => setInfo(prev => ({ ...prev, addressCity: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressState">Estado</Label>
              <Input
                id="addressState"
                placeholder="SP"
                maxLength={2}
                value={info.addressState}
                onChange={(e) => setInfo(prev => ({ ...prev, addressState: e.target.value.toUpperCase() }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressZipCode">CEP</Label>
              <Input
                id="addressZipCode"
                placeholder="01234-567"
                value={info.addressZipCode}
                onChange={(e) => setInfo(prev => ({ ...prev, addressZipCode: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressComplement">Complemento (opcional)</Label>
            <Input
              id="addressComplement"
              placeholder="Sala 101, Edifício Comercial"
              value={info.addressComplement}
              onChange={(e) => setInfo(prev => ({ ...prev, addressComplement: e.target.value }))}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="googleMapsUrl" className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-500" />
              Link do Google Maps
            </Label>
            <div className="flex gap-2">
              <Input
                id="googleMapsUrl"
                placeholder="https://www.google.com/maps/search/?api=1&query=..."
                value={info.googleMapsUrl}
                onChange={(e) => setInfo(prev => ({ ...prev, googleMapsUrl: e.target.value }))}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateGoogleMapsUrl}
                className="shrink-0"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Gerar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A IA enviará esse link quando o cliente pedir o endereço ou como chegar
            </p>
            
            {info.googleMapsUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(info.googleMapsUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Testar Link
                </Button>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Check className="w-5 h-5 text-green-500" />
            Preview - Como a IA vai responder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-background border">
              <p className="text-sm font-medium text-muted-foreground mb-1">Cliente: "Qual o endereço de vocês?"</p>
              <p className="text-sm">
                Ficaremos felizes em recebê-lo(a)! 📍<br/>
                {info.address ? (
                  <>
                    Nosso endereço é: {info.address}
                    {info.addressCity ? `, ${info.addressCity}` : ''}
                    {info.addressState ? ` - ${info.addressState}` : ''}
                    {info.addressComplement ? ` (${info.addressComplement})` : ''}<br/><br/>
                    {info.googleMapsUrl && (
                      <>🗺️ Veja a rota no Google Maps: <span className="text-blue-500 underline">{info.googleMapsUrl}</span></>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground italic">Preencha o endereço para ver o preview</span>
                )}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-background border">
              <p className="text-sm font-medium text-muted-foreground mb-1">Cliente: "Não conheço o salão de vocês"</p>
              <p className="text-sm">
                Que tal conhecer nosso trabalho antes de agendar? 💇‍♀️<br/>
                {info.instagram ? (
                  <>📸 Visite nosso Instagram: @{info.instagram}<br/></>
                ) : (
                  <span className="text-muted-foreground italic">Preencha o Instagram para ver o preview</span>
                )}
                {info.description && (
                  <><br/>✨ {info.description}</>
                )}
                {!info.instagram && !info.description && (
                  <span className="text-muted-foreground italic">Preencha o Instagram e/ou descrição</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Informações
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
