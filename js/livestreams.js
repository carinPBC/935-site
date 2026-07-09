/**
 * Livestreams widget — fetches CMS-managed livestreams for this station
 * and renders them into the given container. Replaces the old hardcoded
 * Courthouse Plaza embed (see station-css-pattern.md, July 9 2026).
 */
(function () {
  function toEmbedUrl(url) {
    // YouTube watch/live/shorts -> embed
    var yt = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/live\/|youtube\.com\/shorts\/|youtu\.be\/)([\w-]+)/);
    if (yt) return 'https://www.youtube.com/embed/' + yt[1] + '?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0';
    if (url.indexOf('youtube.com/embed') !== -1) {
      return url + (url.indexOf('?') !== -1 ? '&' : '?') + 'autoplay=1&mute=1&controls=1&modestbranding=1&rel=0';
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
    return url; // already-embeddable / direct
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  window.renderLivestreams = function (station, containerId, apiBase) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var API = apiBase || 'https://pbc-cms-production.up.railway.app';
    fetch(API + '/api/livestreams/' + station)
      .then(function (r) { return r.json(); })
      .then(function (streams) {
        if (!Array.isArray(streams) || streams.length === 0) return; // leave container empty, no layout shift
        el.innerHTML = streams.map(function (s) {
          var embed = toEmbedUrl(s.video_url);
          var label = s.title ? escHtml(s.title) : 'Live';
          return '<div style="margin-bottom:16px;">'
            + '<div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:8px;">&#128247; Live &mdash; ' + label + '</div>'
            + '<div style="position:relative;width:100%;padding-bottom:56.25%;border-radius:8px;overflow:hidden;background:#000;">'
            + '<iframe src="' + embed + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allow="autoplay; fullscreen" allowfullscreen></iframe>'
            + '</div></div>';
        }).join('');
      })
      .catch(function () { /* fail silently — matches video-popup.js safe-failure pattern */ });
  };
})();
