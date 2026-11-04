
  (function () {
    var overlay = document.getElementById('dither-intro');
    var canvas = document.getElementById('dither-canvas');
    if (!overlay || !canvas) return;
    var ctx = canvas.getContext('2d');
    var COLS = 0, ROWS = 0;
    var art = document.querySelector('img.art');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var bayer = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
    var lum = null, hasArt = false, buf = null;

    function sizeCanvas() {
      var w = window.innerWidth || 1280, h = window.innerHeight || 800;
      var cell = w < 640 ? 5 : 7;
      COLS = Math.max(56, Math.min(260, Math.round(w / cell)));
      ROWS = Math.max(64, Math.min(260, Math.round(h / cell)));
      canvas.width = COLS; canvas.height = ROWS;
      buf = ctx.createImageData(COLS, ROWS);
      lum = null;
    }
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);

    function buildLum() {
      var artReady = art && art.complete && art.naturalWidth;
      if (lum && hasArt) return;
      hasArt = artReady;
      var s = document.createElement('canvas');
      s.width = COLS; s.height = ROWS;
      var sc = s.getContext('2d');
      sc.fillStyle = '#000'; sc.fillRect(0, 0, COLS, ROWS);
      if (hasArt) {
        var side = Math.min(COLS * 0.9, ROWS * 0.5);
        sc.drawImage(art, art.naturalWidth * 0.27, art.naturalHeight * 0.45, art.naturalWidth * 0.46, art.naturalHeight * 0.33, (COLS - side) / 2, ROWS * 0.07, side, side);
      }
      var fs = Math.max(11, Math.round(ROWS * 0.17));
      sc.fillStyle = '#fff';
      sc.textAlign = 'center'; sc.textBaseline = 'middle';
      sc.font = '700 ' + fs + 'px monospace';
      var kx = Math.min(1.6, (COLS * 0.86) / Math.max(1, sc.measureText('CASPIAN').width));
      sc.save();
      sc.translate(COLS / 2, ROWS * 0.855);
      sc.scale(kx, 1);
      sc.fillText('CASPIAN', 0, 0);
      sc.restore();
      var d = sc.getImageData(0, 0, COLS, ROWS).data;
      lum = new Float32Array(COLS * ROWS);
      for (var i = 0; i < lum.length; i++) lum[i] = (d[i*4] * 0.3 + d[i*4+1] * 0.59 + d[i*4+2] * 0.11) / 255;
    }

    function draw(t) {
      buildLum();
      var emerge = Math.min(1, t / 3400);
      var noiseAmp = 0.52 - 0.30 * emerge;
      var sweepY = ((t % 2200) / 2200) * ROWS;
      var d = buf.data;
      for (var y = 0; y < ROWS; y++) {
        var sweep = Math.max(0, 1 - Math.abs(y - sweepY) / 7) * 0.3;
        for (var x = 0; x < COLS; x++) {
          var i = y * COLS + x;
          var v = (lum[i] || 0) * emerge + (Math.random() - 0.5) * noiseAmp + sweep * (0.4 + 0.6 * Math.random());
          var px = i * 4;
          if (v > (bayer[((y & 7) << 3) | (x & 7)] / 64)) { d[px] = 232; d[px+1] = 232; d[px+2] = 236; }
          else { d[px] = 8; d[px+1] = 8; d[px+2] = 10; }
          d[px+3] = 255;
        }
      }
      ctx.putImageData(buf, 0, 0);
    }

    var started = performance.now(), raf = 0, last = 0, killed = false;
    function loop(now) {
      if (killed) return;
      if (now - last >= 110) { last = now; draw(now - started); }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    function finish() {
      if (killed) return;
      killed = true;
      cancelAnimationFrame(raf);
      if (reduce) overlay.style.transition = 'none';
      overlay.classList.add('done');
      setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 950);
    }
    var timer = setTimeout(finish, reduce ? 400 : 4800);
    overlay.addEventListener('click', finish);
  })();
