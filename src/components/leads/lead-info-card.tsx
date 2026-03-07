'use client'

import { useEffect, useState } from 'react'
import { Pencil, Save, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { updateLead } from '@/lib/supabase/leads'
import { getCustomFieldDefinitions } from '@/lib/supabase/custom-fields'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '@/lib/constants'
import type { Lead, LeadStatus, CustomFieldDefinition } from '@/lib/types'

interface LeadInfoCardProps {
  lead: Lead
  onUpdate: (lead: Lead) => void
}

interface EditableFields {
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string
  position: string
  score: number
  status: string
}

export function LeadInfoCard({ lead, onUpdate }: LeadInfoCardProps) {
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(
    lead.custom_fields || {}
  )
  const [fields, setFields] = useState<EditableFields>({
    first_name: lead.first_name || '',
    last_name: lead.last_name || '',
    email: lead.email,
    phone: lead.phone || '',
    company: lead.company || '',
    position: lead.position || '',
    score: lead.score,
    status: lead.status,
  })

  useEffect(() => {
    if (currentOrg) {
      getCustomFieldDefinitions(currentOrg.id)
        .then(setCustomFieldDefs)
        .catch((err) => console.error('Erro ao carregar campos personalizados:', err))
    }
  }, [currentOrg])

  const handleEdit = () => {
    setFields({
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      email: lead.email,
      phone: lead.phone || '',
      company: lead.company || '',
      position: lead.position || '',
      score: lead.score,
      status: lead.status,
    })
    setCustomFieldValues(lead.custom_fields || {})
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateLead(lead.id, {
        first_name: fields.first_name || null,
        last_name: fields.last_name || null,
        email: fields.email,
        phone: fields.phone || null,
        company: fields.company || null,
        position: fields.position || null,
        score: Math.min(100, Math.max(0, fields.score)),
        status: fields.status as LeadStatus,
        custom_fields: customFieldValues,
      })
      onUpdate(updated)
      setEditing(false)
      toast({ title: 'Lead atualizado', description: 'As alteracoes foram salvas com sucesso.' })
    } catch (error) {
      console.error('Erro ao atualizar lead:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel salvar as alteracoes.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const updateField = (key: keyof EditableFields, value: string | number) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const updateCustomField = (name: string, value: any) => {
    setCustomFieldValues((prev) => ({ ...prev, [name]: value }))
  }

  const renderCustomFieldInput = (def: CustomFieldDefinition) => {
    const value = customFieldValues[def.name] ?? ''
    switch (def.field_type) {
      case 'text':
      case 'url':
      case 'email':
      case 'phone':
        return (
          <Input
            id={`cf_${def.name}`}
            type={def.field_type === 'email' ? 'email' : def.field_type === 'url' ? 'url' : 'text'}
            value={value}
            onChange={(e) => updateCustomField(def.name, e.target.value)}
            placeholder={def.label}
          />
        )
      case 'number':
        return (
          <Input
            id={`cf_${def.name}`}
            type="number"
            value={value}
            onChange={(e) => updateCustomField(def.name, e.target.value ? Number(e.target.value) : '')}
            placeholder={def.label}
          />
        )
      case 'date':
        return (
          <Input
            id={`cf_${def.name}`}
            type="date"
            value={value}
            onChange={(e) => updateCustomField(def.name, e.target.value)}
          />
        )
      case 'boolean':
        return (
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id={`cf_${def.name}`}
              checked={!!value}
              onCheckedChange={(checked) => updateCustomField(def.name, !!checked)}
            />
            <Label htmlFor={`cf_${def.name}`} className="text-sm font-normal">
              {def.label}
            </Label>
          </div>
        )
      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(v) => updateCustomField(def.name, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {(def.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      default:
        return (
          <Input
            id={`cf_${def.name}`}
            value={value}
            onChange={(e) => updateCustomField(def.name, e.target.value)}
            placeholder={def.label}
          />
        )
    }
  }

  const statusLabel = LEAD_STATUS_LABELS[lead.status] || lead.status
  const statusColor = LEAD_STATUS_COLORS[lead.status] || ''

  const scoreColor =
    lead.score >= 70 ? 'bg-green-500' : lead.score >= 40 ? 'bg-yellow-500' : 'bg-gray-300'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Informacoes do Lead</CardTitle>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nome</Label>
              <Input
                id="first_name"
                value={fields.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Sobrenome</Label>
              <Input
                id="last_name"
                value={fields.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={fields.email}
                onChange={(e) => updateField('email', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={fields.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={fields.company}
                onChange={(e) => updateField('company', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Cargo</Label>
              <Input
                id="position"
                value={fields.position}
                onChange={(e) => updateField('position', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="score">Score (0-100)</Label>
              <Input
                id="score"
                type="number"
                min={0}
                max={100}
                value={fields.score}
                onChange={(e) => updateField('score', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={fields.status}
                onValueChange={(value) => updateField('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Fields - Edit Mode */}
            {customFieldDefs.length > 0 && (
              <>
                <div className="col-span-1 md:col-span-2 pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-4">Campos Personalizados</p>
                </div>
                {customFieldDefs.map((def) => (
                  <div key={def.id} className="space-y-2">
                    {def.field_type !== 'boolean' && (
                      <Label htmlFor={`cf_${def.name}`}>
                        {def.label}
                        {def.required && <span className="text-destructive"> *</span>}
                      </Label>
                    )}
                    {renderCustomFieldInput(def)}
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <InfoField label="Nome" value={lead.first_name} />
              <InfoField label="Sobrenome" value={lead.last_name} />
              <InfoField label="Email" value={lead.email} />
              <InfoField label="Telefone" value={lead.phone} />
              <InfoField label="Empresa" value={lead.company} />
              <InfoField label="Cargo" value={lead.position} />
              <InfoField label="Origem" value={lead.source} />
              <InfoField label="ID Externo" value={lead.external_id} />
            </div>

            {/* Custom Fields - Read Mode */}
            {customFieldDefs.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-3">Campos Personalizados</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  {customFieldDefs.map((def) => {
                    const val = lead.custom_fields?.[def.name]
                    let displayValue: string | null = null
                    if (val !== undefined && val !== null && val !== '') {
                      if (def.field_type === 'boolean') {
                        displayValue = val ? 'Sim' : 'Nao'
                      } else {
                        displayValue = String(val)
                      }
                    }
                    return (
                      <InfoField key={def.id} label={def.label} value={displayValue} />
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="secondary" className={statusColor}>
                  {statusLabel}
                </Badge>
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-sm text-muted-foreground">Score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-[200px] h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${scoreColor}`}
                      style={{ width: `${Math.min(100, Math.max(0, lead.score))}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{lead.score}/100</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || <span className="text-muted-foreground">-</span>}</p>
    </div>
  )
}
