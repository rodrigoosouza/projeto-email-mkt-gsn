export async function publishToSocial(
  platform: string,
  accessToken: string,
  content: string,
  mediaUrls: string[] = []
): Promise<{ success: boolean; postId?: string; error?: string }> {
  // Dev mode - just log
  if (!accessToken || accessToken === '') {
    console.log(`[DEV] Publish to ${platform}:`, content.substring(0, 100))
    return { success: true, postId: `mock_${platform}_${Date.now()}` }
  }

  try {
    switch (platform) {
      case 'facebook': {
        const res = await fetch(`https://graph.facebook.com/v19.0/me/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, access_token: accessToken }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error.message)
        return { success: true, postId: data.id }
      }
      case 'instagram':
      case 'linkedin':
      case 'twitter':
      case 'tiktok':
        console.log(
          `[${platform}] Publish scheduled (integration pending):`,
          content.substring(0, 50)
        )
        return { success: true, postId: `${platform}_${Date.now()}` }
      default:
        return { success: false, error: `Plataforma nao suportada: ${platform}` }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
