import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

    const snippet = `<!-- Plataforma Email - Tracking Snippet -->
<script>
(function() {
  var ORG_ID = '${orgId}';
  var ENDPOINT = '${appUrl}/api/tracking/collect';
  var sid = sessionStorage.getItem('pe_sid') || crypto.randomUUID();
  sessionStorage.setItem('pe_sid', sid);
  var vid = localStorage.getItem('pe_vid') || crypto.randomUUID();
  localStorage.setItem('pe_vid', vid);
  var started = Date.now();
  var maxScroll = 0;
  var pageCount = parseInt(sessionStorage.getItem('pe_pages') || '0') + 1;
  sessionStorage.setItem('pe_pages', pageCount);

  function getUTM(key) {
    var match = location.search.match(new RegExp('[?&]' + key + '=([^&]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function getDevice() {
    var w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  window.addEventListener('scroll', function() {
    var h = document.documentElement;
    var depth = Math.round(((h.scrollTop + window.innerHeight) / h.scrollHeight) * 100);
    if (depth > maxScroll) maxScroll = depth;
  });

  function send(event, extra) {
    var data = {
      org_id: ORG_ID,
      session_id: sid,
      visitor_id: vid,
      event: event,
      page: location.pathname,
      referrer: document.referrer || null,
      utm_source: getUTM('utm_source'),
      utm_medium: getUTM('utm_medium'),
      utm_campaign: getUTM('utm_campaign'),
      device: getDevice(),
      browser: navigator.userAgent,
      scroll_depth: maxScroll,
      duration: Math.round((Date.now() - started) / 1000),
      pages_viewed: pageCount,
      timestamp: new Date().toISOString()
    };
    if (extra) Object.assign(data, extra);
    navigator.sendBeacon(ENDPOINT, JSON.stringify(data));
  }

  send('pageview');
  window.addEventListener('beforeunload', function() { send('session_end'); });
  setInterval(function() { send('heartbeat'); }, 30000);
})();
</script>`

    return NextResponse.json({ snippet, orgId })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
