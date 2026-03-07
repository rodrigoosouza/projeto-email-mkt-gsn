-- Migration 018: Fix RLS infinite recursion on organization_members and organizations
-- Problem: SELECT policies on organization_members referenced the same table in subqueries,
-- causing PostgreSQL to apply the policy recursively (infinite loop).
-- Solution: SECURITY DEFINER helper functions that bypass RLS for membership checks.

-- Helper: get org IDs the current user belongs to (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM organization_members WHERE user_id = auth.uid();
$$;

-- Helper: check if current user is admin of a given org (bypasses RLS)
CREATE OR REPLACE FUNCTION is_org_admin(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = check_org_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Fix organization_members policies
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "Creator can add themselves as first member" ON organization_members;

CREATE POLICY "Users can view org members"
  ON organization_members FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Admins can insert members"
  ON organization_members FOR INSERT
  WITH CHECK (
    is_org_admin(org_id)
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM organizations WHERE id = org_id AND created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can update members"
  ON organization_members FOR UPDATE
  USING (is_org_admin(org_id));

CREATE POLICY "Admins can delete members"
  ON organization_members FOR DELETE
  USING (is_org_admin(org_id));

-- Fix organizations SELECT policy
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT get_user_org_ids()));
