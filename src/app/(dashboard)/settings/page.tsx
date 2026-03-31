'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OrganizationForm } from '@/components/settings/organization-form'
import { MembersList } from '@/components/settings/members-list'
import { InviteUserForm } from '@/components/settings/invite-user-form'
import { ApiKeysManager } from '@/components/settings/api-keys-manager'
import { DomainVerification } from '@/components/settings/domain-verification'
import { CustomFieldsManager } from '@/components/settings/custom-fields-manager'
import { ScoringRulesManager } from '@/components/settings/scoring-rules-manager'
import { IntegrationsManager } from '@/components/settings/integrations-manager'
import { AppearanceSettings } from '@/components/settings/appearance-settings'
import { PermissionsManager } from '@/components/settings/permissions-manager'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuracoes</h2>
        <p className="text-muted-foreground">
          Gerencie as configuracoes da sua organizacao.
        </p>
      </div>

      <Tabs defaultValue="organization" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organization">Organizacao</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="email-domain">Dominio de Email</TabsTrigger>
          <TabsTrigger value="custom-fields">Campos Personalizados</TabsTrigger>
          <TabsTrigger value="lead-scoring">Lead Scoring</TabsTrigger>
          <TabsTrigger value="integrations">Integracoes</TabsTrigger>
          <TabsTrigger value="appearance">Aparencia</TabsTrigger>
          <TabsTrigger value="permissions">Permissoes</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <OrganizationForm />
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <InviteUserForm />
          <Card>
            <CardHeader>
              <CardTitle>Membros da Organizacao</CardTitle>
              <CardDescription>
                Lista de todos os membros e suas funcoes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MembersList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys">
          <ApiKeysManager />
        </TabsContent>

        <TabsContent value="email-domain">
          <DomainVerification />
        </TabsContent>

        <TabsContent value="custom-fields">
          <CustomFieldsManager />
        </TabsContent>

        <TabsContent value="lead-scoring">
          <ScoringRulesManager />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsManager />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionsManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
