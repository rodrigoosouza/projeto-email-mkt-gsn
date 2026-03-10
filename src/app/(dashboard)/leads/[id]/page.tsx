'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { getLead, deleteLead, getLeadTags } from '@/lib/supabase/leads'
import { createClient } from '@/lib/supabase/client'
import { LeadInfoCard } from '@/components/leads/lead-info-card'
import { LeadTagsManager } from '@/components/leads/lead-tags-manager'
import { LeadTimeline } from '@/components/leads/lead-timeline'
import { LeadTrackingJourney } from '@/components/leads/lead-tracking-journey'
import { Skeleton } from '@/components/ui/skeleton'
import type { Lead, LeadTag } from '@/lib/types'

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const leadId = params.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [allTags, setAllTags] = useState<LeadTag[]>([])
  const [assignedTagIds, setAssignedTagIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchLead = useCallback(async () => {
    try {
      const data = await getLead(leadId)
      setLead(data)
    } catch (error) {
      console.error('Erro ao buscar lead:', error)
      toast({ title: 'Erro', description: 'Lead nao encontrado.', variant: 'destructive' })
      router.push('/leads')
    }
  }, [leadId, router, toast])

  const fetchTags = useCallback(async () => {
    if (!currentOrg) return
    try {
      const tags = await getLeadTags(currentOrg.id)
      setAllTags(tags)
    } catch (error) {
      console.error('Erro ao buscar tags:', error)
    }
  }, [currentOrg])

  const fetchAssignedTags = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('lead_tag_assignments')
      .select('tag_id')
      .eq('lead_id', leadId)
    if (data) {
      setAssignedTagIds(data.map((d) => d.tag_id))
    }
  }, [leadId])

  useEffect(() => {
    async function load() {
      setLoading(true)
      await Promise.all([fetchLead(), fetchTags(), fetchAssignedTags()])
      setLoading(false)
    }
    load()
  }, [fetchLead, fetchTags, fetchAssignedTags])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteLead(leadId)
      toast({ title: 'Lead excluido', description: 'O lead foi excluido com sucesso.' })
      router.push('/leads')
    } catch (error) {
      console.error('Erro ao excluir lead:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel excluir o lead.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const handleLeadUpdate = (updatedLead: Lead) => {
    setLead(updatedLead)
  }

  const handleTagsChange = () => {
    fetchAssignedTags()
    fetchTags()
  }

  const displayName = lead
    ? [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email
    : ''

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[400px] w-full rounded-lg" />
          </div>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!lead) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => router.push('/leads')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Leads
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">{displayName}</h2>
        </div>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir lead</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o lead{' '}
                <strong>{displayName}</strong>? Esta acao nao pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LeadInfoCard lead={lead} onUpdate={handleLeadUpdate} />
          {currentOrg && (
            <LeadTimeline leadId={lead.id} orgId={currentOrg.id} />
          )}
          <LeadTrackingJourney email={lead.email} phone={lead.phone} orgSlug={currentOrg?.slug} />
        </div>
        <div>
          <LeadTagsManager
            leadId={lead.id}
            allTags={allTags}
            assignedTagIds={assignedTagIds}
            onTagsChange={handleTagsChange}
          />
        </div>
      </div>
    </div>
  )
}
