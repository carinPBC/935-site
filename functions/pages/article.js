/**
 * Cloudflare Pages Function — intercepts article page requests
 * Injects OG/Twitter meta tags server-side for social crawlers
 * Passes through normally for regular browsers
 */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const articleId = url.searchParams.get('id');
  
  // Only inject meta for social crawlers (or if article ID present)
  const ua = request.headers.get('user-agent') || '';
  const isCrawler = /facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|whatsapp|discord|googlebot/i.test(ua);
  
  // For non-crawlers without article ID, serve normally
  if (!articleId) {
    return fetch(request);
  }
  
  // Fetch the base HTML
  const htmlResponse = await fetch(request);
  const html = await htmlResponse.text();
  
  // Fetch article data from CMS
  const API = 'https://pbc-cms-production.up.railway.app';
  let title = 'Article — 93.5 Classic Rock';
  let description = 'News from 93.5 Classic Rock — Prescott, Arizona';
  let image = '';
  
  try {
    const r = await fetch(`${API}/api/news/${articleId}`);
    if (r.ok) {
      const article = await r.json();
      if (article.headline) {
        title = article.headline + ' — 93.5 Classic Rock';
        description = (article.body || '').replace(/<[^>]+>/g, '').substring(0, 200);
        if (article.image) {
          image = article.image.startsWith('http') 
            ? article.image 
            : `${API}/${article.image.replace(/^\//, '')}`;
        }
      }
    }
  } catch(e) {}
  
  // Inject OG tags into the <head>
  const escapedTitle = title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const escapedDesc = description.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const canonicalUrl = `https://935-site.pages.dev/pages/article.html?id=${articleId}`;
  
  const ogTags = `
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="93.5 Classic Rock" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDesc}" />
  <meta property="og:url" content="${canonicalUrl}" />
  ${image ? `<meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDesc}" />
  ${image ? `<meta name="twitter:image" content="${image}" />` : ''}
  <title>${escapedTitle}</title>`;
  
  // Replace the generic title and inject OG tags
  const injected = html
    .replace(/<title>Article[^<]*<\/title>/, '')
    .replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />${ogTags}`);
  
  return new Response(injected, {
    headers: { 
      'content-type': 'text/html;charset=UTF-8',
      'cache-control': 'public, max-age=60'
    }
  });
}
