-- Migration 028: Hierarchical Organization Support
-- Adds parent/child org relationships (agency -> client -> sub_client)
-- All changes are ADDITIVE — no existing RLS policies or functions are modified

-- =============================================================================
-- 1. New columns on organizations
-- =============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS parent_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS org_type TEXT NOT NULL DEFAULT 'client' CHECK (org_type IN ('agency', 'client', 'sub_client'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS depth INTEGER NOT NULL DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

COMMENT ON COLUMN organizations.parent_org_id IS 'Parent org for hierarchy: agency -> client -> sub_client';
COMMENT ON COLUMN organizations.org_type IS 'agency=top level, client=under agency, sub_client=under client';
COMMENT ON COLUMN organizations.depth IS '0=root/agency, 1=client, 2=sub_client';

-- =============================================================================
-- 2. Index on parent_org_id
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_org_id) WHERE parent_org_id IS NOT NULL;

-- =============================================================================
-- 3. org_permissions table
-- =============================================================================

CREATE TABLE IF NOT EXISTS org_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer', 'client_admin')),
  resource TEXT NOT NULL CHECK (resource IN ('leads', 'campaigns', 'analytics', 'blog', 'settings', 'billing', 'members', 'integrations', 'site')),
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_read BOOLEAN NOT NULL DEFAULT true,
  can_update BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, role, resource)
);

-- =============================================================================
-- 4. RLS on org_permissions
-- =============================================================================

ALTER TABLE org_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_permissions_select" ON org_permissions
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "org_permissions_admin" ON org_permissions
  FOR ALL USING (is_org_admin(org_id));

-- =============================================================================
-- 5. Function: get_descendant_org_ids (recursive)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_descendant_org_ids(root_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH RECURSIVE descendants AS (
    SELECT id FROM organizations WHERE id = root_id
    UNION ALL
    SELECT o.id FROM organizations o INNER JOIN descendants d ON o.parent_org_id = d.id
  )
  SELECT id FROM descendants;
$$;

-- =============================================================================
-- 6. Function: get_visible_org_ids (hierarchy-aware visibility)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_visible_org_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _member RECORD;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;

  FOR _member IN
    SELECT om.org_id, om.role, o.org_type
    FROM organization_members om
    JOIN organizations o ON o.id = om.org_id
    WHERE om.user_id = _user_id
  LOOP
    -- Always return the direct org
    RETURN NEXT _member.org_id;

    -- If admin of agency or client, return descendants too
    IF _member.role = 'admin' AND _member.org_type IN ('agency', 'client') THEN
      RETURN QUERY
        SELECT id FROM organizations
        WHERE parent_org_id = _member.org_id
        UNION ALL
        SELECT o2.id FROM organizations o2
        WHERE o2.parent_org_id IN (
          SELECT id FROM organizations WHERE parent_org_id = _member.org_id
        );
    END IF;
  END LOOP;
END;
$$;

-- =============================================================================
-- 7. Seed default permissions for existing admin members
-- =============================================================================

INSERT INTO org_permissions (org_id, role, resource, can_create, can_read, can_update, can_delete)
SELECT DISTINCT om.org_id, 'admin', r.resource, true, true, true, true
FROM organization_members om
CROSS JOIN (VALUES ('leads'), ('campaigns'), ('analytics'), ('blog'), ('settings'), ('billing'), ('members'), ('integrations'), ('site')) AS r(resource)
WHERE om.role = 'admin'
ON CONFLICT (org_id, role, resource) DO NOTHING;
