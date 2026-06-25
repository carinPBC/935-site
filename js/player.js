/**
 * 93.5 Classic Rock — Minimal popup player
 * Direct HTML5 audio from stream, no third-party embeds
 */
(function() {
  var STREAM_URL  = 'https://www.ophanim.net:8444/s/8010';
  var CMS_API     = 'https://pbc-cms-production.up.railway.app';
  var STORAGE_KEY = 'crr_player_open';
  var VOL_KEY     = 'crr_volume';

  // ── CSS ──────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = `
    #crr-player-widget {
      position: fixed;
      bottom: -260px;
      right: 20px;
      width: 320px;
      background: #1a0a00;
      border-radius: 12px 12px 0 0;
      box-shadow: 0 -4px 32px rgba(0,0,0,0.6);
      z-index: 99999;
      transition: bottom 0.35s cubic-bezier(0.4,0,0.2,1);
      border: 1px solid rgba(163,38,0,0.4);
      border-bottom: none;
      font-family: 'Inter', sans-serif;
    }
    #crr-player-widget.visible { bottom: 0; }

    #crr-player-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #0d0500;
      border-bottom: 2px solid #a32600;
      border-radius: 12px 12px 0 0;
      cursor: pointer;
      user-select: none;
    }
    #crr-player-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #crr-player-logo-img {
      height: 28px;
      width: auto;
      object-fit: contain;
    }
    .crr-live-dot {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #a32600;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: .1em;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 3px;
    }
    .crr-live-dot::before {
      content: '';
      width: 5px; height: 5px;
      background: #fff;
      border-radius: 50%;
      animation: crr-pulse 1.2s ease-in-out infinite;
    }
    @keyframes crr-pulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:.4; transform:scale(.7); }
    }
    #crr-player-header-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #crr-minimize-btn, #crr-close-btn {
      background: none;
      border: none;
      color: rgba(255,255,255,0.5);
      font-size: 16px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      line-height: 1;
      transition: color .15s;
    }
    #crr-minimize-btn:hover, #crr-close-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }

    #crr-track-bar {
      padding: 10px 14px;
      background: rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
    }
    #crr-track-now {
      font-size: 11px;
      font-weight: 700;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: .06em;
      flex-shrink: 0;
    }
    #crr-track-text {
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    #crr-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: #0d0500;
    }
    #crr-play-btn {
      width: 44px; height: 44px;
      border-radius: 50%;
      background: #a32600;
      border: none;
      cursor: pointer;
      color: #fff;
      font-size: 18px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background .15s, transform .1s;
    }
    #crr-play-btn:hover { background: #7a1d00; transform: scale(1.07); }
    #crr-vol-wrap { flex: 1; display: flex; align-items: center; gap: 8px; }
    #crr-vol-icon { color: rgba(255,255,255,0.5); font-size: 14px; cursor: pointer; }
    #crr-vol {
      -webkit-appearance: none; appearance: none;
      width: 100%; height: 3px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px; outline: none; cursor: pointer;
    }
    #crr-vol::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 13px; height: 13px;
      border-radius: 50%; background: #a32600; cursor: pointer;
    }
    #crr-vol::-moz-range-thumb {
      width: 13px; height: 13px;
      border-radius: 50%; background: #a32600; border: none;
    }
    body.crr-player-open { padding-bottom: 0; }
    @media (max-width: 400px) {
      #crr-player-widget { width: calc(100vw - 16px); right: 8px; }
    }
  `;
  document.head.appendChild(style);

  // ── HTML ──────────────────────────────────────────────────────────────────
  var widget = document.createElement('div');
  widget.id = 'crr-player-widget';
  widget.innerHTML = `
    <div id="crr-player-header">
      <div id="crr-player-header-left">
        <img id="crr-player-logo-img" src="/images/logo-935-cream.svg" onerror="this.style.display='none'" alt="93.5" />
        <span class="crr-live-dot">Live</span>
      </div>
      <div id="crr-player-header-right">
        <button id="crr-minimize-btn" title="Minimize">&#8211;</button>
        <button id="crr-close-btn" title="Close">&#10005;</button>
      </div>
    </div>
    <div id="crr-track-bar">
      <span id="crr-track-now">Now Playing</span>
      <span id="crr-track-text">93.5 Classic Rock</span>
    </div>
    <div id="crr-controls">
      <button id="crr-play-btn">&#9654;</button>
      <div id="crr-vol-wrap">
        <span id="crr-vol-icon">&#128266;</span>
        <input type="range" id="crr-vol" min="0" max="1" step="0.02" value="1" />
      </div>
    </div>
    <audio id="crr-audio" preload="none" style="display:none"></audio>
  `;
  document.body.appendChild(widget);

  // ── State ─────────────────────────────────────────────────────────────────
  var audio     = document.getElementById('crr-audio');
  var playBtn   = document.getElementById('crr-play-btn');
  var volSlider = document.getElementById('crr-vol');
  var volIcon   = document.getElementById('crr-vol-icon');
  var trackText = document.getElementById('crr-track-text');
  var isOpen    = false;
  var isMinimized = false;
  var isPlaying = false;
  var trackTimer = null;

  var savedVol = parseFloat(localStorage.getItem(VOL_KEY) || '1');
  audio.volume = savedVol;
  volSlider.value = savedVol;

  function updateVolIcon() {
    if (audio.muted || audio.volume === 0) volIcon.innerHTML = '&#128263;';
    else if (audio.volume < 0.5) volIcon.innerHTML = '&#128265;';
    else volIcon.innerHTML = '&#128266;';
  }

  function startAudio() {
    audio.src = STREAM_URL;
    audio.load();
    audio.play().then(function() {
      isPlaying = true;
      playBtn.innerHTML = '&#9646;&#9646;';
    }).catch(function() {
      isPlaying = false;
      playBtn.innerHTML = '&#9654;';
    });
  }

  function stopAudio() {
    audio.pause();
    audio.src = '';
    isPlaying = false;
    playBtn.innerHTML = '&#9654;';
  }

  function fetchTrack() {
    fetch(CMS_API + '/api/recent-tracks/935?ts=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(tracks) {
        if (tracks && tracks.length) {
          var t = tracks[0];
          trackText.textContent = (t.artist || '') + (t.artist && t.title ? ' \u2014 ' : '') + (t.title || '');
        }
      }).catch(function(){});
  }

  function openPlayer() {
    isOpen = true;
    isMinimized = false;
    widget.classList.add('visible');
    widget.style.bottom = '';
    localStorage.setItem(STORAGE_KEY, '1');
    startAudio();
    fetchTrack();
    if (!trackTimer) trackTimer = setInterval(fetchTrack, 30000);
  }

  function minimizePlayer() {
    isMinimized = true;
    widget.style.bottom = '-' + (widget.offsetHeight - 44) + 'px';
  }

  function closePlayer() {
    stopAudio();
    isOpen = false;
    isMinimized = false;
    widget.classList.remove('visible');
    widget.style.bottom = '';
    localStorage.removeItem(STORAGE_KEY);
    if (trackTimer) { clearInterval(trackTimer); trackTimer = null; }
  }

  // ── Events ────────────────────────────────────────────────────────────────
  playBtn.addEventListener('click', function() {
    if (isPlaying) { stopAudio(); } else { startAudio(); }
  });

  volSlider.addEventListener('input', function() {
    audio.volume = parseFloat(this.value);
    localStorage.setItem(VOL_KEY, this.value);
    updateVolIcon();
  });

  volIcon.addEventListener('click', function() {
    audio.muted = !audio.muted;
    updateVolIcon();
  });

  document.getElementById('crr-minimize-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    if (isMinimized) { isMinimized = false; widget.style.bottom = ''; }
    else { minimizePlayer(); }
  });

  document.getElementById('crr-close-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    closePlayer();
  });

  document.getElementById('crr-player-header').addEventListener('click', function() {
    if (isMinimized) { isMinimized = false; widget.style.bottom = ''; }
  });

  // ── Listen Live button delegation ─────────────────────────────────────────
  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-listen]');
    if (!el) return;
    e.preventDefault();
    if (!isOpen) { openPlayer(); }
    else if (isMinimized) { isMinimized = false; widget.style.bottom = ''; }
  });

  // ── Restore on page navigation ────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      openPlayer();
    }
  });

})();
