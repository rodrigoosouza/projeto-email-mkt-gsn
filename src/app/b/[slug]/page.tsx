import { notFound } from 'next/navigation'
import { getBioPageBySlug, trackBioPageView } from '@/lib/supabase/bio-links'
import { BioPageClient } from './bio-page-client'

interface Props {
  params: { slug: string }
}

export default async function PublicBioPage({ params }: Props) {
  let page

  try {
    page = await getBioPageBySlug(params.slug)
  } catch {
    notFound()
  }

  if (!page || !page.is_active) {
    notFound()
  }

  // Track view server-side
  await trackBioPageView(page.id)

  const activeLinks = (page.links || []).filter(
    (link: any) => link.is_active
  )

  return <BioPageClient page={page} links={activeLinks} />
}
