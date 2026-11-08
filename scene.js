(function () {
  var cfg = normalize(window.BIRTHDAY || {});
  var scene = document.getElementById("scene");
  var golden = document.getElementById("golden");
  var maltese = document.getElementById("maltese");
  var cake = document.getElementById("cake");
  var start = document.getElementById("start");
  var hint = document.getElementById("hint");
  var puff = document.getElementById("puff");
  var letter = document.getElementById("letter");
  var state = "start";
  var musicOn = false;
  var audioCtx = null;

  cake.innerHTML = cakeSVG(cfg.candleCount);
  renderLetter();
  document.title = cfg.toName ? cfg.toName + "，" + cfg.title : cfg.title;

  start.addEventListener("click", startShow);
  golden.addEventListener("click", onGolden);
  cake.addEventListener("click", onCake);

  function normalize(raw) {
    var src = raw && typeof raw === "object" ? raw : {};
    var count = parseInt(src.candleCount, 10);
    if (!isFinite(count)) count = 5;
    count = Math.max(1, Math.min(12, count));
    var lines = Array.isArray(src.lines)
      ? src.lines.map(function (line) { return String(line); })
      : [];
    return {
      toName: src.toName != null ? String(src.toName) : "宝贝",
      title: src.title != null ? String(src.title) : "生日快乐",
      fromName: src.fromName != null ? String(src.fromName).trim() : "",
      candleCount: count,
      musicSrc: src.musicSrc != null ? String(src.musicSrc).trim() : "",
      lines: lines
    };
  }

  function setState(next) {
    state = next;
    scene.dataset.state = next;
  }

  function say(text) {
    if (!text) {
      hint.hidden = true;
      hint.textContent = "";
      return;
    }
    hint.hidden = false;
    hint.textContent = text;
  }

  function setTarget(name) {
    var g = name === "golden";
    var c = name === "cake";
    golden.disabled = !g;
    cake.disabled = !c;
    golden.classList.toggle("is-target", g);
    cake.classList.toggle("is-target", c);
  }

  function startShow() {
    if (state !== "start") return;
    setState("together");
    startAudio();
    start.remove();
    setTarget("golden");
    say("点点金毛");
  }

  function onGolden() {
    if (state === "together") serveCake();
    else if (state === "lit") wishAndBlow();
  }

  function onCake() {
    if (state === "cake") lightCandles();
  }

  function serveCake() {
    setState("serving");
    setTarget(null);
    say("蛋糕要来了");
    golden.classList.add("pushing");
    cake.classList.add("served");
    window.setTimeout(function () {
      if (state !== "serving") return;
      setState("cake");
      setTarget("cake");
      say("点点蛋糕");
    }, 1200);
  }

  function lightCandles() {
    setState("lighting");
    setTarget(null);
    say("点亮蜡烛");
    golden.classList.add("lean");
    var candles = cake.querySelectorAll(".candle");
    Array.prototype.forEach.call(candles, function (node, index) {
      window.setTimeout(function () {
        node.classList.add("lit");
      }, 520 + index * 420);
    });
    var done = 520 + candles.length * 420 + 480;
    window.setTimeout(function () {
      if (state !== "lighting") return;
      setState("lit");
      setTarget("golden");
      say("再点点金毛");
    }, done);
  }

  function wishAndBlow() {
    setState("wishing");
    setTarget(null);
    say("许个愿吧");
    maltese.classList.add("wishing");
    window.setTimeout(function () {
      if (state !== "wishing") return;
      say("吹灭蜡烛");
      maltese.classList.add("blowing");
      puff.classList.add("go");
    }, 1700);
    window.setTimeout(function () {
      cake.querySelectorAll(".candle").forEach(function (node) {
        node.classList.remove("lit");
        node.classList.add("out");
      });
    }, 2360);
    window.setTimeout(showLetter, 4000);
  }

  function showLetter() {
    setState("letter");
    say("");
    scene.classList.add("is-dimmed");
    letter.hidden = false;
    letter.setAttribute("aria-hidden", "false");
    void letter.offsetWidth;
    letter.classList.add("show");
    var title = document.getElementById("letterTitle");
    if (title) title.focus();
  }

  function renderLetter() {
    document.getElementById("letterTitle").textContent = cfg.title;
    var to = document.getElementById("letterTo");
    if (cfg.toName) {
      to.hidden = false;
      to.textContent = cfg.toName + "：";
    } else {
      to.hidden = true;
    }
    var body = document.getElementById("letterBody");
    var lines = cfg.lines.length ? cfg.lines : ["生日快乐。"];
    lines.forEach(function (line) {
      var p = document.createElement("p");
      p.textContent = line;
      body.appendChild(p);
    });
    var from = document.getElementById("letterFrom");
    if (cfg.fromName) {
      from.hidden = false;
      from.textContent = "—— " + cfg.fromName;
    }
  }

  function startAudio() {
    try {
      if (cfg.musicSrc) startFile();
      else startMelody();
    } catch (err) {
      scene.dataset.audio = "error";
    }
  }

  function startFile() {
    var el = new Audio(cfg.musicSrc);
    el.loop = true;
    el.preload = "auto";
    el.setAttribute("playsinline", "");
    scene.dataset.audio = "file";
    el.addEventListener("playing", function () {
      musicOn = true;
      scene.dataset.audioState = "playing";
    });
    el.addEventListener("error", function () {
      if (!musicOn) startMelody();
    });
    var pending = el.play();
    if (pending && pending.catch) {
      pending.catch(function () {
        if (!musicOn) startMelody();
      });
    }
  }

  function startMelody() {
    if (musicOn) return;
    musicOn = true;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      scene.dataset.audio = "error";
      return;
    }
    audioCtx = new Ctx();
    var master = audioCtx.createGain();
    master.gain.value = 0.9;
    var filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    filter.connect(master);
    master.connect(analyser);
    analyser.connect(audioCtx.destination);
    var resume = audioCtx.resume();
    var begin = function () {
      scene.dataset.audio = "melody";
      scene.dataset.audioState = audioCtx.state;
      armMelody(audioCtx, filter);
      window.setTimeout(function () {
        var buf = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(buf);
        var peak = 0;
        for (var i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
        scene.dataset.audioPeak = String(peak);
      }, 700);
    };
    if (resume && resume.then) resume.then(begin);
    else begin();
  }

  function armMelody(ctx, dest) {
    var beat = 0.42;
    var gap = 1.3;
    var notes = [
      [261.63, 0.75], [261.63, 0.25], [293.66, 1], [261.63, 1], [349.23, 1], [329.63, 2],
      [261.63, 0.75], [261.63, 0.25], [293.66, 1], [261.63, 1], [392.00, 1], [349.23, 2],
      [261.63, 0.75], [261.63, 0.25], [523.25, 1], [440.00, 1], [349.23, 1], [329.63, 1], [293.66, 2],
      [466.16, 0.75], [466.16, 0.25], [440.00, 1], [349.23, 1], [392.00, 1], [349.23, 2]
    ];
    var next = ctx.currentTime + 0.06;

    function schedule() {
      if (ctx.state === "closed") return;
      var t = next;
      notes.forEach(function (note) {
        var dur = note[1] * beat;
        tone(ctx, dest, note[0], t, Math.max(0.08, dur - 0.045));
        t += dur;
      });
      next = t + gap;
      var wait = (t - ctx.currentTime - 0.45) * 1000;
      window.setTimeout(schedule, Math.max(200, wait));
    }

    schedule();
  }

  function tone(ctx, dest, freq, time, dur) {
    var osc = ctx.createOscillator();
    var over = ctx.createOscillator();
    var gain = ctx.createGain();
    var overGain = ctx.createGain();
    osc.type = "triangle";
    over.type = "sine";
    osc.frequency.setValueAtTime(freq, time);
    over.frequency.setValueAtTime(freq * 2, time);
    overGain.gain.setValueAtTime(0.15, time);
    osc.connect(gain);
    over.connect(overGain);
    overGain.connect(gain);
    gain.connect(dest);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.22, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.start(time);
    over.start(time);
    osc.stop(time + dur + 0.03);
    over.stop(time + dur + 0.03);
  }

  function cakeSVG(count) {
    var colors = ["#f7c9c9", "#f6e3b4", "#f8d2ea", "#f3e2c8", "#f8c9a8"];
    var maxSpan = 96;
    var gap = count === 1 ? 0 : Math.min(20, maxSpan / (count - 1));
    var span = gap * (count - 1);
    var startX = 110 - span / 2;
    var candles = "";
    for (var i = 0; i < count; i++) {
      var x = count === 1 ? 110 : startX + gap * i;
      var color = colors[i % colors.length];
      candles +=
        '<g class="candle" transform="translate(' + x.toFixed(1) + ' 132)">' +
          '<rect x="-3.5" y="-36" width="7" height="38" rx="2.5" fill="' + color + '" stroke="#e4c2ae" stroke-width="1"/>' +
          '<line x1="0" y1="-36" x2="0" y2="-42" stroke="#6d5346" stroke-width="1.6" stroke-linecap="round"/>' +
          '<g class="flame">' +
            '<ellipse cx="0" cy="-50" rx="5" ry="8" fill="#ff9a3c"/>' +
            '<ellipse cx="0" cy="-48.5" rx="2.2" ry="4.2" fill="#fff1c4"/>' +
          '</g>' +
          '<g class="smoke">' +
            '<path d="M0 -54 C4 -64 -3 -72 2 -86" fill="none" stroke="#d5ccc2" stroke-width="1.7" stroke-linecap="round"/>' +
          '</g>' +
        '</g>';
    }
    return (
      '<svg viewBox="0 0 220 236" aria-hidden="true">' +
        '<ellipse cx="110" cy="214" rx="84" ry="12" fill="#f4e6d6" stroke="#e3d0bc" stroke-width="2"/>' +
        '<path d="M46 150 H174 V198 Q110 216 46 198 Z" fill="#f3c48a" stroke="#d39b6c" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M48 154 q10 24 20 6 q8 20 18 -2 q10 22 18 2 q12 20 20 -4 q10 24 18 4 q8 16 16 -2 q8 14 14 0 V150 H48 Z" fill="#fff8ef"/>' +
        '<ellipse cx="110" cy="150" rx="66" ry="24" fill="#fff8ef" stroke="#f0d4c2" stroke-width="2.2"/>' +
        '<ellipse cx="92" cy="146" rx="22" ry="8" fill="#fff" opacity="0.55"/>' +
        '<circle cx="70" cy="176" r="7" fill="#e06b6b"/>' +
        '<circle cx="150" cy="178" r="6.5" fill="#e06b6b"/>' +
        '<path d="M70 170 q-6 -8 0 -10 q6 2 0 10" fill="#7dae72"/>' +
        '<path d="M150 172 q-5 -7 0 -9 q5 2 0 9" fill="#7dae72"/>' +
        candles +
      '</svg>'
    );
  }
})();
