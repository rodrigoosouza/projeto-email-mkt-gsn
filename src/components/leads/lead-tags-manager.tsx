'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { addTagToLead, removeTagFromLead, createLeadTag } from '@/lib/supabase/leads'
import { TAG_COLORS } from '@/lib/constants'
import type { LeadTag } from '@/lib/types'

interface LeadTagsManagerProps {
  leadId: string
  allTags: LeadTag[]
  assignedTagIds: string[]
  onTagsChange: () => void
}

export function LeadTagsManager({
  leadId,
  allTags,
  assignedTagIds,
  onTagsChange,
}: LeadTagsManagerProps) {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS[0])
  const [creatingTag, setCreatingTag] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const assignedTags = allTags.filter((tag) => assignedTagIds.includes(tag.id))
  const availableTags = allTags.filter((tag) => !assignedTagIds.includes(tag.id))

  const handleAddTag = async (tagId: string) => {
    try {
      await addTagToLead(leadId, tagId)
      onTagsChange()
    } catch (error) {
      console.error('Erro ao adicionar tag:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel adicionar a tag.',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagFromLead(leadId, tagId)
      onTagsChange()
    } catch (error) {
      console.error('Erro ao remover tag:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel remover a tag.',
        variant: 'destructive',
      })
    }
  }

  const handleCreateTag = async () => {
    if (!currentOrg || !newTagName.trim()) return

    setCreatingTag(true)
    try {
      const tag = await createLeadTag(currentOrg.id, newTagName.trim(), newTagColor)
      await addTagToLead(leadId, tag.id)
      setNewTagName('')
      setShowCreateForm(false)
      onTagsChange()
      toast({ title: 'Tag criada', description: `A tag "${tag.name}" foi criada e adicionada.` })
    } catch (error) {
      console.error('Erro ao criar tag:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel criar a tag.',
        variant: 'destructive',
      })
    } finally {
      setCreatingTag(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Assigned Tags */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Tags atribuidas</p>
          <div className="flex flex-wrap gap-2">
            {assignedTags.length > 0 ? (
              assignedTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="pr-1"
                  style={{
                    borderColor: tag.color,
                    color: tag.color,
                    backgroundColor: `${tag.color}15`,
                  }}
                >
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-1 rounded-full p-0.5 hover:bg-black/10"
                    aria-label={`Remover tag ${tag.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma tag atribuida</p>
            )}
          </div>
        </div>

        {/* Available Tags */}
        {availableTags.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Adicionar tag</p>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Button
                  key={tag.id}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  style={{
                    borderColor: tag.color,
                    color: tag.color,
                  }}
                  onClick={() => handleAddTag(tag.id)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {tag.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Create New Tag */}
        <div className="border-t pt-4">
          {showCreateForm ? (
            <div className="space-y-3">
              <Input
                placeholder="Nome da tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag()
                }}
              />
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded-full border-2 transition-transform"
                    style={{
                      backgroundColor: color,
                      borderColor: newTagColor === color ? '#000' : 'transparent',
                      transform: newTagColor === color ? 'scale(1.2)' : 'scale(1)',
                    }}
                    onClick={() => setNewTagColor(color)}
                    aria-label={`Selecionar cor ${color}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || creatingTag}
                >
                  {creatingTag ? 'Criando...' : 'Criar tag'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewTagName('')
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar nova tag
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
