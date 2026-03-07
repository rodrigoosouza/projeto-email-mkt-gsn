'use client'

import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SEGMENT_RULE_FIELDS, OPERATOR_LABELS } from '@/lib/constants'

export interface RuleInput {
  field: string
  operator: string
  value: string
}

interface RuleBuilderProps {
  rules: RuleInput[]
  onChange: (rules: RuleInput[]) => void
}

const NUMERIC_FIELDS = ['score']
const EVENT_FIELDS = ['has_event', 'email_opened', 'email_clicked', 'email_bounced']
const TAG_FIELDS = ['has_tag']
const DATE_FIELDS = ['created_at', 'last_event_at']

const STRING_OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'starts_with',
  'ends_with',
  'is_empty',
  'is_not_empty',
]

const NUMERIC_OPERATORS = [
  'equals',
  'greater_than',
  'less_than',
  'is_empty',
  'is_not_empty',
]

const EVENT_OPERATORS = [
  'has_occurred',
  'has_not_occurred',
  'occurred_after',
  'occurred_before',
]

const TAG_OPERATORS = [
  'equals',
  'contains',
  'is_empty',
  'is_not_empty',
]

const DATE_OPERATORS = [
  'before',
  'after',
  'in_last_days',
]

const NO_VALUE_OPERATORS = ['is_empty', 'is_not_empty', 'has_occurred', 'has_not_occurred']

const EVENT_TYPE_OPTIONS = [
  { value: 'created', label: 'Lead criado' },
  { value: 'email_sent', label: 'Email enviado' },
  { value: 'email_delivered', label: 'Email entregue' },
  { value: 'email_opened', label: 'Email aberto' },
  { value: 'email_clicked', label: 'Link clicado' },
  { value: 'campaign_added', label: 'Adicionado a campanha' },
  { value: 'score_changed', label: 'Score alterado' },
  { value: 'status_changed', label: 'Status alterado' },
  { value: 'tag_added', label: 'Tag adicionada' },
  { value: 'tag_removed', label: 'Tag removida' },
  { value: 'segment_added', label: 'Adicionado a segmento' },
  { value: 'custom', label: 'Evento customizado' },
]

function getOperatorsForField(field: string): string[] {
  if (NUMERIC_FIELDS.includes(field)) return NUMERIC_OPERATORS
  if (EVENT_FIELDS.includes(field)) return EVENT_OPERATORS
  if (TAG_FIELDS.includes(field)) return TAG_OPERATORS
  if (DATE_FIELDS.includes(field)) return DATE_OPERATORS
  return STRING_OPERATORS
}

function getValueInputType(field: string, operator: string): 'text' | 'select-event' | 'date' | 'number' | 'none' {
  if (NO_VALUE_OPERATORS.includes(operator)) return 'none'
  if (field === 'has_event') return 'select-event'
  if (DATE_FIELDS.includes(field)) {
    if (operator === 'in_last_days') return 'number'
    return 'date'
  }
  if (NUMERIC_FIELDS.includes(field)) return 'number'
  if (EVENT_FIELDS.includes(field) && ['occurred_after', 'occurred_before'].includes(operator)) return 'date'
  return 'text'
}

// Group fields by category
const fieldGroups = SEGMENT_RULE_FIELDS.reduce((groups, field) => {
  const group = field.group || 'Outros'
  if (!groups[group]) groups[group] = []
  groups[group].push(field)
  return groups
}, {} as Record<string, typeof SEGMENT_RULE_FIELDS>)

export function RuleBuilder({ rules, onChange }: RuleBuilderProps) {
  const handleAddRule = () => {
    onChange([...rules, { field: 'email', operator: 'contains', value: '' }])
  }

  const handleRemoveRule = (index: number) => {
    if (rules.length <= 1) return
    const updated = rules.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleFieldChange = (index: number, field: string) => {
    const updated = [...rules]
    const operators = getOperatorsForField(field)
    updated[index] = { ...updated[index], field, operator: operators[0], value: '' }
    onChange(updated)
  }

  const handleOperatorChange = (index: number, operator: string) => {
    const updated = [...rules]
    updated[index] = {
      ...updated[index],
      operator,
      value: NO_VALUE_OPERATORS.includes(operator) ? '' : updated[index].value,
    }
    onChange(updated)
  }

  const handleValueChange = (index: number, value: string) => {
    const updated = [...rules]
    updated[index] = { ...updated[index], value }
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      {rules.map((rule, index) => {
        const operators = getOperatorsForField(rule.field)
        const valueType = getValueInputType(rule.field, rule.operator)

        return (
          <div key={index}>
            {index > 0 && (
              <div className="flex items-center gap-2 my-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground px-2">E</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <div className="flex items-start gap-2 rounded-lg border bg-card p-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                {/* Field selector with groups */}
                <Select
                  value={rule.field}
                  onValueChange={(value) => handleFieldChange(index, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(fieldGroups).map(([groupName, fields]) => (
                      <SelectGroup key={groupName}>
                        <SelectLabel className="text-xs text-muted-foreground">{groupName}</SelectLabel>
                        {fields.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operator selector */}
                <Select
                  value={rule.operator}
                  onValueChange={(value) => handleOperatorChange(index, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Operador" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op} value={op}>
                        {OPERATOR_LABELS[op] || op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value input — varies by field type */}
                {valueType === 'none' ? null : valueType === 'select-event' ? (
                  <Select
                    value={rule.value}
                    onValueChange={(value) => handleValueChange(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPE_OPTIONS.map((evt) => (
                        <SelectItem key={evt.value} value={evt.value}>
                          {evt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : valueType === 'date' ? (
                  <Input
                    type="date"
                    value={rule.value}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                  />
                ) : valueType === 'number' ? (
                  <Input
                    type="number"
                    placeholder={rule.operator === 'in_last_days' ? 'Numero de dias' : 'Valor'}
                    value={rule.value}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                  />
                ) : (
                  <Input
                    placeholder="Valor"
                    value={rule.value}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                  />
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveRule(index)}
                disabled={rules.length <= 1}
                className="shrink-0 mt-0.5"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}

      <Button type="button" variant="outline" size="sm" onClick={handleAddRule}>
        <Plus className="mr-2 h-4 w-4" />
        Adicionar regra
      </Button>
    </div>
  )
}
