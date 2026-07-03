/**
 * video-popup.js — Centrally-managed autoplay video popup
 * Fetches config from CMS (/api/video-popup-config). Shows once per browser
 * session on homepage only, if current site is in the enabled sites list.
 * Can be minimized to a bottom-right PiP thumbnail (keeps playing) or
 * dismissed entirely (closes for the rest of the session).
 * Optional title bar caption shown above the video and on the PiP label.
 * Escape key closes the full modal.
 *
 * Usage: <script src="js/video-popup.js" data-site="pb"></script>
 * Place on homepage only, after layout.js.
 */
(function () {
  var script = document.currentScript;
  var SITE_ID = script && script.getAttribute('data-site');
  if (!SITE_ID) { console.warn('video-popup.js: missing data-site attribute'); return; }

  var API = 'https://pbc-cms-production.up.railway.app';
  var SESSION_KEY = 'pbc_video_popup_dismissed_' + SITE_ID;
  var SESSION_SHOWN_KEY = 'pbc_video_popup_shown_' + SITE_ID;

  // Already dismissed this session? Bail entirely.
  if (sessionStorage.getItem(SESSION_KEY) === '1') return;

  fetch(API + '/api/video-popup-config')
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      if (!cfg || !cfg.enabled || !cfg.video_url) return;
      var sites = Array.isArray(cfg.sites) ? cfg.sites : [];
      if (sites.indexOf(SITE_ID) === -1) return;

      // Already shown once this session and not dismissed -> restore minimized PiP state
      var alreadyShown = sessionStorage.getItem(SESSION_SHOWN_KEY) === '1';
      buildWidget(cfg.video_url, cfg.title || '', alreadyShown);
    })
    .catch(function (e) { console.warn('video-popup: could not load config', e); });

  function toEmbedUrl(url) {
    // YouTube watch/live/shorts -> embed
    var yt = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/live\/|youtube\.com\/shorts\/|youtu\.be\/)([\w-]+)/);
    if (yt) return 'https://www.youtube.com/embed/' + yt[1] + '?autoplay=1&mute=1&playsinline=1&enablejsapi=1';
    if (url.indexOf('youtube.com/embed') !== -1) {
      return url + (url.indexOf('?') !== -1 ? '&' : '?') + 'autoplay=1&mute=1&playsinline=1&enablejsapi=1';
    }
    // Vimeo event (livestream) — vimeo.com/event/ID -> vimeo.com/event/ID/embed
    var vme = url.match(/vimeo\.com\/event\/(\d+)/);
    if (vme) return 'https://vimeo.com/event/' + vme[1] + '/embed?autoplay=1&muted=1';
    // Vimeo regular video
    var vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return 'https://player.vimeo.com/video/' + vm[1] + '?autoplay=1&muted=1';
    if (url.indexOf('player.vimeo.com') !== -1 || url.indexOf('vimeo.com/event/') !== -1) {
      return url + (url.indexOf('?') !== -1 ? '&' : '?') + 'autoplay=1&muted=1';
    }
    return url; // direct mp4 or already-embeddable
  }

  function isDirectVideo(url) {
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function buildWidget(videoUrl, title, startMinimized) {
    var embedUrl = toEmbedUrl(videoUrl);
    var direct = isDirectVideo(videoUrl);
    var hasTitle = !!(title && title.trim());
    var safeTitle = hasTitle ? escHtml(title.trim()) : '';

    var style = document.createElement('style');
    style.id = 'pbc-video-popup-style';
    style.textContent = [
      '#pbc-vp-overlay{position:fixed;inset:0;background:rgba(10,10,10,.72);z-index:99998;display:flex;align-items:center;justify-content:center;animation:pbcVpFadeIn .25s ease;}',
      '@keyframes pbcVpFadeIn{from{opacity:0}to{opacity:1}}',
      '#pbc-vp-modal{position:relative;width:min(880px,92vw);background:#000;border-radius:10px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);}',
      '#pbc-vp-modal .pbc-vp-ratio{position:relative;width:100%;padding-top:56.25%;}',
      '#pbc-vp-modal .pbc-vp-ratio iframe,#pbc-vp-modal .pbc-vp-ratio video{position:absolute;inset:0;width:100%;height:100%;border:0;}',
      '#pbc-vp-titlebar{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#111;color:#fff;padding:10px 14px;font-family:Inter,sans-serif;}',
      '#pbc-vp-titlebar .pbc-vp-title-text{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '#pbc-vp-titlebar-controls{display:flex;gap:8px;flex-shrink:0;}',
      '.pbc-vp-btn-inline{width:28px;height:28px;border-radius:50%;border:none;background:rgba(255,255,255,.15);color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}',
      '.pbc-vp-btn-inline:hover{background:rgba(255,255,255,.3);}',
      '#pbc-vp-controls{position:absolute;top:10px;right:10px;display:flex;gap:8px;z-index:2;}',
      '#pbc-vp-controls button{width:36px;height:36px;border-radius:50%;border:none;background:rgba(0,0,0,.6);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}',
      '#pbc-vp-controls button:hover{background:rgba(0,0,0,.85);}',
      '#pbc-vp-pip{position:fixed;bottom:20px;right:20px;width:260px;background:#000;border-radius:10px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.4);z-index:99997;cursor:pointer;display:none;}',
      '#pbc-vp-pip .pbc-vp-ratio{position:relative;width:100%;padding-top:56.25%;}',
      '#pbc-vp-pip .pbc-vp-ratio iframe,#pbc-vp-pip .pbc-vp-ratio video{position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none;}',
      '#pbc-vp-pip .pbc-vp-pip-close{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;border:none;background:rgba(0,0,0,.65);color:#fff;font-size:13px;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;}',
      '#pbc-vp-pip .pbc-vp-pip-label{position:absolute;bottom:0;left:0;right:0;padding:6px 8px;font-size:11px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.75));font-family:Inter,sans-serif;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '@media(max-width:640px){#pbc-vp-pip{width:180px;right:12px;bottom:12px;}}'
    ].join('\n');
    document.head.appendChild(style);

    var mediaHtml = direct
      ? '<video src="' + embedUrl + '" autoplay muted playsinline loop></video>'
      : '<iframe src="' + embedUrl + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';

    // Overlay (full modal)
    var overlay = document.createElement('div');
    overlay.id = 'pbc-vp-overlay';
    var modalInner;
    if (hasTitle) {
      modalInner =
        '<div id="pbc-vp-titlebar">' +
          '<span class="pbc-vp-title-text">' + safeTitle + '</span>' +
          '<div id="pbc-vp-titlebar-controls">' +
            '<button id="pbc-vp-minimize" class="pbc-vp-btn-inline" aria-label="Minimize" title="Minimize">&#8211;</button>' +
            '<button id="pbc-vp-close" class="pbc-vp-btn-inline" aria-label="Close" title="Close">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="pbc-vp-ratio">' + mediaHtml + '</div>';
    } else {
      modalInner =
        '<div id="pbc-vp-controls">' +
          '<button id="pbc-vp-minimize" aria-label="Minimize" title="Minimize">&#8211;</button>' +
          '<button id="pbc-vp-close" aria-label="Close" title="Close">&times;</button>' +
        '</div>' +
        '<div class="pbc-vp-ratio">' + mediaHtml + '</div>';
    }
    overlay.innerHTML = '<div id="pbc-vp-modal">' + modalInner + '</div>';

    // PiP (minimized)
    var pip = document.createElement('div');
    pip.id = 'pbc-vp-pip';
    var pipLabel = hasTitle ? safeTitle : 'Click to expand';
    pip.innerHTML =
      '<button class="pbc-vp-pip-close" aria-label="Close">&times;</button>' +
      '<div class="pbc-vp-ratio">' + mediaHtml + '</div>' +
      '<div class="pbc-vp-pip-label">' + pipLabel + '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(pip);

    function showOverlay() {
      overlay.style.display = 'flex';
      pip.style.display = 'none';
    }
    function showPip() {
      overlay.style.display = 'none';
      pip.style.display = 'block';
    }
    function dismissAll() {
      overlay.remove();
      pip.remove();
      style.remove();
      document.removeEventListener('keydown', onKeydown);
      sessionStorage.setItem(SESSION_KEY, '1');
    }
    function onKeydown(e) {
      if (e.key === 'Escape' && overlay.style.display === 'flex') {
        dismissAll();
      }
    }

    overlay.querySelector('#pbc-vp-minimize').addEventListener('click', function () {
      showPip();
    });
    overlay.querySelector('#pbc-vp-close').addEventListener('click', function () {
      dismissAll();
    });
    pip.querySelector('.pbc-vp-pip-close').addEventListener('click', function (e) {
      e.stopPropagation();
      dismissAll();
    });
    pip.addEventListener('click', function () {
      showOverlay();
    });
    document.addEventListener('keydown', onKeydown);

    sessionStorage.setItem(SESSION_SHOWN_KEY, '1');

    if (startMinimized) {
      showPip();
    } else {
      showOverlay();
    }
  }
})();
