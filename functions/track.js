/**
 * Cloudflare Pages Function — click tracker proxy
 * Forwards to Railway CMS without exposing the backend URL
 *
 * Hardened July 9 2026: requires a same-origin Referer so the endpoint
 * can't be triggered blind by bots/crawlers hitting the URL directly
 * (raw HTML links are crawlable even when CSS-hidden — this endpoint
 * was logging phantom clicks as a result). Real clicks always carry a
 * same-origin Referer since the link lives on this site's own pages.
 */

const CMS = 'https://pbc-cms-production.up.railway.app';
const STATION = '935';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const referer = context.request.headers.get('Referer') || '';

  let sameOrigin = false;
  try {
    sameOrigin = referer && new URL(referer).origin === url.origin;
  } catch (e) {
    sameOrigin = false;
  }
  if (!sameOrigin) {
    return new Response('Forbidden', { status: 403 });
  }

  const dest  = url.searchParams.get('url');
  const type  = url.searchParams.get('type') || 'ad';
  const label = url.searchParams.get('label') || '';
  const page  = url.searchParams.get('page') || '';

  if (!dest) {
    return new Response('Missing url', { status: 400 });
  }

  const trackUrl = CMS + '/api/track/click?station=' + STATION
    + '&type=' + encodeURIComponent(type)
    + '&label=' + encodeURIComponent(label)
    + '&url=' + encodeURIComponent(dest)
    + '&page=' + encodeURIComponent(page);

  // Log click to CMS (fire and forget — don't block redirect)
  context.waitUntil(fetch(trackUrl).catch(function() {}));

  return Response.redirect(dest, 302);
}
