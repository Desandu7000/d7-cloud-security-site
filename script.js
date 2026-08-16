/* ============================================================================
   D7 — Cloud Computing and Security Issues
   script.js

   STAGE 0: TYPING SOUND ENGINE

   A soft synthesised key-click, played by the intro's title typewriter and
   the console's command line — window.D7Sound.play(). (The content pages'
   own body-text typewriter, Stage 2, deliberately does NOT call this: at
   that speed, over a whole paragraph, a click per character overlapped
   into a noisy blur rather than discrete keystrokes, so it plays no sound
   at all instead.)

   No audio file is used — just a short filtered noise burst through the
   Web Audio API, so there's nothing to download and no licensing to worry
   about.

   Starts muted: browsers block audio from playing before a user gesture
   anyway, so the sound-toggle button IS that gesture — clicking it both
   creates/resumes the AudioContext and flips the mute flag in one action.
   ========================================================================== */

(function () {
  'use strict';

  var soundBtn = document.getElementById('sound-toggle');
  var soundState = { ctx: null, muted: true };

  function ensureAudioContext() {
    if (!soundState.ctx) {
      var AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) { return null; }
      soundState.ctx = new AudioCtor();
    }
    return soundState.ctx;
  }

  function playKeySound() {
    if (soundState.muted || !soundState.ctx || soundState.ctx.state !== 'running') { return; }

    var ctx = soundState.ctx;
    var now = ctx.currentTime;
    var duration = 0.03;

    /* A short burst of noise, linearly faded to silence across its own
       buffer, then band-passed — this reads as a dry "click" rather than
       the pure tone an oscillator alone would produce. */
    var bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    var noise = ctx.createBufferSource();
    noise.buffer = buffer;

    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200 + Math.random() * 900;   /* slight per-key jitter */
    filter.Q.value = 1.1;

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      var ctx = ensureAudioContext();
      if (ctx && ctx.state === 'suspended') { ctx.resume(); }

      soundState.muted = !soundState.muted;
      soundBtn.setAttribute('aria-pressed', String(!soundState.muted));
      soundBtn.querySelector('[data-sound-label]').textContent = soundState.muted ? 'sound off' : 'sound on';
      soundBtn.querySelector('.sound-toggle__icon').textContent = soundState.muted ? '\u{1F507}' : '\u{1F508}';
    });
  }

  window.D7Sound = { play: playKeySound };

})();


/* ============================================================================
   STAGE 1: the landing intro.

   The whole intro is one asynchronous "timeline" function. Each beat of the
   animation is an `await` — that keeps the sequence readable top-to-bottom
   instead of turning into nested setTimeout callbacks.

   Contents:
     00. Setup & element references
     01. Small helpers (sleep, abortable waiting, reduced-motion check)
     02. Caret positioning
     03. Typewriter
     04. Boot log
     05. The intro timeline
     06. Hand-off to the console screen
     07. Skip handling + boot
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     00. SETUP
     Everything is wrapped in an IIFE (Immediately Invoked Function Expression)
     so none of these variables leak into the global scope.
  -------------------------------------------------------------------------- */

  var el = {
    body:      document.body,
    intro:     document.getElementById('intro'),
    console:   document.getElementById('console'),
    skipBtn:   document.getElementById('skip-btn'),
    bootLog:   document.getElementById('boot-log'),
    title:     document.querySelector('.intro-title'),
    linePres:  document.getElementById('line-presents'),
    lineMain:  document.getElementById('line-main'),
    caret:     document.getElementById('intro-caret'),
    sub:       document.getElementById('intro-sub')
  };

  /* Shared run-state for the intro. */
  var state = {
    aborted:  false,   // set to true by the skip button / Esc key
    finished: false,   // guards against the hand-off running twice
    wake:     null     // resolver used to cut a pending sleep() short
  };

  /* Sentinel thrown to unwind the timeline when the user skips.
     Using a unique object (rather than a string) means we can tell a real
     error apart from a deliberate abort in the catch block. */
  var ABORT = { abort: true };

  /* The text the intro types out. */
  var TEXT_PRESENTS = 'D7 presents:';
  var TEXT_MAIN     = 'Cloud Computing and Security Issues';

  /* Fake boot log lines. `ok: true` renders the line in accent colour. */
  var BOOT_LINES = [
    { text: '> initialising secure session ...' },
    { text: '> mounting /vol/cloud-research', ok: true },
    { text: '> loading modules: breach · iam · malware' },
    { text: '> integrity check ......... PASSED', ok: true },
    { text: '> authenticating operator D7 ...' }
  ];


  /* --------------------------------------------------------------------------
     01. HELPERS
  -------------------------------------------------------------------------- */

  /* True when the visitor's operating system is set to "reduce motion".
     We honour it by playing the intro instantly instead of animating it. */
  function prefersReducedMotion() {
    return window.matchMedia &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* An abortable pause.
     Resolves after `ms`, OR immediately if state.wake() is called by skip().
     Every await point in the timeline therefore becomes a chance to bail out. */
  function sleep(ms) {
    return new Promise(function (resolve) {
      var timer = setTimeout(function () {
        state.wake = null;
        resolve();
      }, ms);

      state.wake = function () {
        clearTimeout(timer);
        state.wake = null;
        resolve();
      };
    });
  }

  /* Called after every await: if the user skipped, unwind the timeline. */
  function checkpoint() {
    if (state.aborted) { throw ABORT; }
  }


  /* --------------------------------------------------------------------------
     02. CARET POSITIONING
     The caret is one absolutely-positioned element that gets moved to the end
     of whichever line is currently being typed. A Range is used to measure the
     text rather than the element box, so the caret lands correctly even when
     the long title wraps onto two or three lines.
  -------------------------------------------------------------------------- */

  function moveCaretTo(lineEl) {
    if (!el.caret || !lineEl) { return; }

    var host = el.title.getBoundingClientRect();
    var rect;

    if (lineEl.firstChild) {
      var range = document.createRange();
      range.selectNodeContents(lineEl);
      var rects = range.getClientRects();
      rect = rects.length ? rects[rects.length - 1] : lineEl.getBoundingClientRect();
    } else {
      /* Empty line: fall back to the element box so the caret still shows. */
      rect = lineEl.getBoundingClientRect();
    }

    el.caret.style.left   = (rect.right - host.left) + 'px';
    el.caret.style.top    = (rect.top  - host.top)  + 'px';
    el.caret.style.height = (rect.height * 0.92) + 'px';
    el.caret.style.width  = (rect.height * 0.45) + 'px';
  }

  function hideCaret() {
    if (el.caret) { el.caret.classList.add('is-hidden'); }
  }


  /* --------------------------------------------------------------------------
     03. TYPEWRITER
     Writes `text` into `lineEl` one character at a time.

     Two details that make it feel hand-typed rather than mechanical:
       - the delay per character is jittered slightly
       - spaces get a marginally longer pause, like a real keystroke rhythm
  -------------------------------------------------------------------------- */

  function typeInto(lineEl, text, speed) {
    var i = 0;

    /* Solid (non-blinking) caret while keys are "pressed". */
    if (el.caret) { el.caret.classList.add('is-typing'); }

    return new Promise(function (resolve) {
      function step() {
        if (state.aborted) { resolve(); return; }

        lineEl.textContent = text.slice(0, i);
        moveCaretTo(lineEl);
        if (i > 0 && window.D7Sound) { window.D7Sound.play(); }   /* i === 0 is the empty first frame, not a keystroke */

        if (i >= text.length) {
          if (el.caret) { el.caret.classList.remove('is-typing'); }
          resolve();
          return;
        }

        i++;

        /* Jitter: base speed ±40%, with a small extra beat after a space. */
        var delay = speed * (0.6 + Math.random() * 0.8);
        if (text.charAt(i - 1) === ' ') { delay += speed * 0.6; }

        var timer = setTimeout(step, delay);

        /* Allow skip() to cut the typing short mid-word. */
        state.wake = function () {
          clearTimeout(timer);
          state.wake = null;
          resolve();
        };
      }

      step();
    });
  }


  /* --------------------------------------------------------------------------
     04. BOOT LOG
     Appends the fake system lines one at a time. Runs before the title.
  -------------------------------------------------------------------------- */

  function renderBootLine(line) {
    var span = document.createElement('span');
    if (line.ok) { span.className = 'ok'; }
    span.textContent = line.text + '\n';
    el.bootLog.appendChild(span);
  }

  function bootLogInstant() {
    el.bootLog.textContent = '';
    BOOT_LINES.forEach(renderBootLine);
  }

  async function playBootLog() {
    el.bootLog.textContent = '';

    for (var i = 0; i < BOOT_LINES.length; i++) {
      renderBootLine(BOOT_LINES[i]);
      await sleep(150 + Math.random() * 130);
      checkpoint();
    }
  }


  /* --------------------------------------------------------------------------
     05. THE INTRO TIMELINE
     Read this function top to bottom to understand the whole animation.
  -------------------------------------------------------------------------- */

  async function playIntro() {
    /* Reduced-motion path: show the finished state, hold briefly, move on. */
    if (prefersReducedMotion()) {
      bootLogInstant();
      el.bootLog.classList.add('is-dimmed');
      el.linePres.textContent = TEXT_PRESENTS;
      el.lineMain.textContent = TEXT_MAIN;
      el.sub.classList.add('is-visible');
      hideCaret();
      /* The sound toggle stays available even here — it still controls the
         console's own typing sound once the hand-off below completes. */
      await sleep(1800);
      enterConsole();
      return;
    }

    try {
      /* Beat 1 — system boots. */
      await sleep(400);         checkpoint();
      await playBootLog();      checkpoint();
      await sleep(420);         checkpoint();

      /* Beat 2 — boot log recedes, the title takes the stage. */
      el.bootLog.classList.add('is-dimmed');
      await sleep(260);         checkpoint();

      /* Beat 3 — type "D7 presents:" */
      await typeInto(el.linePres, TEXT_PRESENTS, 55);
      checkpoint();
      await sleep(520);         checkpoint();   /* deliberate pause for weight */

      /* Beat 4 — type the main title, a little faster. */
      await typeInto(el.lineMain, TEXT_MAIN, 42);
      checkpoint();
      await sleep(300);         checkpoint();

      /* Beat 5 — caret away, subtitle and rule fade in. */
      hideCaret();
      el.sub.classList.add('is-visible');
      await sleep(1500);        checkpoint();

      /* Beat 6 — dissolve into the console. */
      enterConsole();

    } catch (err) {
      /* A skip is expected control flow, not a failure. Anything else is a
         genuine bug, so let it surface in the console. */
      if (err !== ABORT) { throw err; }
    }
  }


  /* --------------------------------------------------------------------------
     06. HAND-OFF TO THE CONSOLE
     Swaps the .is-active class between the two screens. CSS does the fade;
     JS only owns the state change and the tidy-up afterwards.
  -------------------------------------------------------------------------- */

  function enterConsole() {
    if (state.finished) { return; }   /* skip + timeline could both call this */
    state.finished = true;

    el.intro.classList.remove('is-active');
    el.console.classList.add('is-active');

    /* Retire the skip button: hidden AND removed from the tab order. The
       sound toggle stays up — it also controls the console's typing
       sound now, and Stage 2's router takes over managing its visibility
       from here (shown on the console, hidden on content pages). */
    el.skipBtn.setAttribute('hidden', '');

    /* Reveal the site logo — it lives outside both screens and stays up
       for the rest of the session, so this is the one place it turns on. */
    var logo = document.getElementById('site-logo');
    if (logo) { logo.classList.add('is-visible'); }

    /* Let the page scroll again once the cross-fade has played out. */
    setTimeout(function () {
      el.body.classList.remove('is-locked');
    }, 700);
  }


  /* --------------------------------------------------------------------------
     07. SKIP + BOOT
  -------------------------------------------------------------------------- */

  /* Jump straight to the finished state of the intro, then hand over.
     The short delay lets the completed title register for a beat rather than
     vanishing the instant the button is clicked, which felt abrupt. */
  function skipIntro() {
    if (state.aborted || state.finished) { return; }
    state.aborted = true;

    /* Cut short whatever pause or typing is currently in flight. */
    if (state.wake) { state.wake(); }

    /* Snap the intro to its end state. */
    bootLogInstant();
    el.bootLog.classList.add('is-dimmed');
    el.linePres.textContent = TEXT_PRESENTS;
    el.lineMain.textContent = TEXT_MAIN;
    hideCaret();
    el.sub.classList.add('is-visible');

    setTimeout(enterConsole, 260);
  }

  el.skipBtn.addEventListener('click', skipIntro);

  /* Esc also skips — matches the "[esc]" hint printed on the button. */
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !state.finished) { skipIntro(); }
  });

  /* If the window is resized mid-type, re-measure so the caret stays glued
     to the end of the text. */
  window.addEventListener('resize', function () {
    if (state.finished) { return; }
    moveCaretTo(el.lineMain.textContent ? el.lineMain : el.linePres);
  });

  /* Lock scrolling for the duration of the intro and start the timeline. */
  el.body.classList.add('is-locked');
  playIntro();

})();


/* ============================================================================
   STAGE 2: THE CONSOLE + ROUTER

   Handles the command line on the console screen and the terminal-style
   pages it opens. Kept as its own IIFE (separate from the intro above) since
   the two stages don't share state — this one only starts reacting once the
   console screen exists, whether that's after the intro plays or right away
   for a skipped intro.

   Contents:
     00. Setup & element references
     01. Command table (typed text -> target page)
     02. Screen switching (console <-> page, with the reveal replay)
     03. Command handling
     04. Event wiring (form submit, hint/prompt shortcuts, Esc, browser back)
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     00. SETUP
  -------------------------------------------------------------------------- */

  var el = {
    body:      document.body,
    console:   document.getElementById('console'),
    form:      document.getElementById('console-form'),
    input:     document.getElementById('console-input'),
    ghost:     document.getElementById('console-ghost'),
    caret:     document.getElementById('console-caret'),
    feedback:  document.getElementById('console-feedback'),
    counter:   document.querySelector('[data-counter-value]'),
    soundBtn:  document.getElementById('sound-toggle'),
    pages:     Array.prototype.slice.call(document.querySelectorAll('.screen--page'))
  };

  /* Bail out quietly if this markup isn't on the page (e.g. a stripped-down
     test page) rather than throwing on a null reference. */
  if (!el.console || !el.form || !el.input) { return; }

  var activePage = null;   // the page <section> currently open, or null
  var commandCount = 0;    // every recognised command, including "back"

  /* Original full text of every [data-typewriter] element, captured once
     up front — before script.js ever clears any of them for typing —
     so re-typing on a later visit always has the real source text
     regardless of whatever partial/empty state the DOM is currently in. */
  var TYPEWRITER_TEXT = new Map();
  Array.prototype.slice.call(document.querySelectorAll('[data-typewriter]')).forEach(function (node) {
    TYPEWRITER_TEXT.set(node, node.textContent);
  });


  /* --------------------------------------------------------------------------
     01. COMMAND TABLE
     Each key is a page id (must match an element with data-page="<id>" in
     the HTML); the array lists every phrase that should open it. Matching is
     done against the lower-cased, trimmed, whitespace-collapsed input, so
     "  IAM  " and "iam" are treated the same.
  -------------------------------------------------------------------------- */

  var ROUTES = {
    databreach: ['data breach', 'databreach', 'breach'],
    iam:        ['iam', 'identity and access management', 'identity access management'],
    malware:    ['malware', 'ransomware', 'malware and ransomware'],
    about:      ['about', 'references', 'refs', 'reference']
  };

  var BACK_WORDS = ['back', 'console', 'home', 'exit', 'menu'];
  var HELP_WORDS = ['help', '?', 'commands'];

  /* The CSS text-outro transition collapses to ~0ms under reduced motion
     (see styles.css section 10), so showConsole() skips its matching JS
     delay too rather than sitting on a blank-looking page for no reason. */
  function prefersReducedMotion() {
    return window.matchMedia &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function normalise(raw) {
    return raw.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /* Returns a page id for a recognised command, 'BACK' for a return command,
     'HELP' for a help request, or null if nothing matched. */
  function resolveCommand(raw) {
    var value = normalise(raw);
    if (!value) { return null; }

    if (BACK_WORDS.indexOf(value) !== -1) { return 'BACK'; }
    if (HELP_WORDS.indexOf(value) !== -1) { return 'HELP'; }

    for (var pageId in ROUTES) {
      if (ROUTES[pageId].indexOf(value) !== -1) { return pageId; }
    }
    return null;
  }


  /* --------------------------------------------------------------------------
     01b. PAGE TEXT TYPEWRITER
     The [data-typewriter] heading + paragraphs on the three prose pages are
     typed in character-by-character, and, on the way out, erased the same
     way in reverse. Silent on purpose — see the STAGE 0 comment above for
     why this doesn't use window.D7Sound like the intro/console do. The
     references page has no [data-typewriter] elements — its citation
     entries contain real <em>/<a> markup a character typewriter would have
     to tear apart, so it keeps the plain fade-stagger reveal defined in
     styles.css instead; isTypedPage() below is what tells the two code
     paths apart.

     Structurally this mirrors the intro's own abortable-sleep pattern
     (Stage 1) closely — same shape, just applied to N sequential elements
     instead of one title, and reused for both directions (typing in AND
     erasing out) via one shared abort state, since the two never overlap
     for a given page.
  -------------------------------------------------------------------------- */

  var TYPE_SPEED   = 9;    // ms/char, base (before jitter) — typing in
  var ERASE_SPEED  = 8;    // ms per tick — erasing out
  var ERASE_CHUNK  = 8;    // characters removed per erase tick — leaving should read as quick
  var WINDOW_REVEAL_MS = 900;   // matches the term-window's own CSS fade-in timing

  /* Cancellation uses a generation TOKEN rather than a shared boolean flag.
     Why: a simple `aborted = true/false` flag has a real race. showConsole()
     calls skipPageTypeIn() (sets aborted=true, wakes the pending timer) and
     then IMMEDIATELY runPageEraseOut() (whose first line used to reset
     aborted=false) — all synchronously. But resolving a Promise never
     resumes its awaiter synchronously; that resumption is queued as a
     microtask. So the old type-in's paused `await typeElementText(...)`
     doesn't actually get a chance to check the abort flag until AFTER the
     erase sequence has already reset it back to false — the old sequence
     would see aborted=false and just keep going, typing forward while the
     new erase sequence deleted characters, racing on the same elements.
     (This is exactly what happened — measured as text length oscillating
     up and down mid-outro instead of monotonically shrinking.)

     Each sequence now calls beginSequence() to get its own token and
     checks isCurrent(token) instead of a shared flag. Even if a stale
     microtask resumes after a newer sequence has started, its captured
     token no longer matches typeState.token, so it correctly stops itself
     — regardless of exactly when its resumption happens to be scheduled. */
  var typeState = { token: 0, wake: null };
  var TYPE_ABORT = { abort: true };

  function beginSequence() {
    typeState.token += 1;
    return typeState.token;
  }

  function isCurrent(token) { return typeState.token === token; }

  function typeSleep(ms) {
    return new Promise(function (resolve) {
      var timer = setTimeout(function () { typeState.wake = null; resolve(); }, ms);
      typeState.wake = function () { clearTimeout(timer); typeState.wake = null; resolve(); };
    });
  }

  function typeCheckpoint(token) { if (!isCurrent(token)) { throw TYPE_ABORT; } }

  function getTypedElements(page) {
    return Array.prototype.slice.call(page.querySelectorAll('[data-typewriter]'));
  }

  function isTypedPage(page) {
    return getTypedElements(page).length > 0;
  }

  /* Types `el`'s full text in from empty.

     No sound is played here (unlike the intro's typewriter and the
     console's input): at this speed, over a whole paragraph, the clicks
     overlapped into a noisy blur rather than reading as discrete
     keystrokes — the visual type-in is kept, the audio just isn't worth
     it at this density. */
  function typeElementText(el, speed, token) {
    var fullText = TYPEWRITER_TEXT.get(el) || '';
    var i = 0;

    return new Promise(function (resolve) {
      function step() {
        if (!isCurrent(token)) { resolve(); return; }

        el.textContent = fullText.slice(0, i);

        if (i >= fullText.length) { resolve(); return; }
        i++;

        var delay = speed * (0.6 + Math.random() * 0.7);
        var timer = setTimeout(step, delay);
        typeState.wake = function () { clearTimeout(timer); typeState.wake = null; resolve(); };
      }
      step();
    });
  }

  /* Erases `el`'s current text down to empty, a few characters at a time.
     Operates on whatever text is currently there, whether that's the
     fully typed paragraph or something the user interrupted mid-type —
     either is fine to erase from. No sound here either, for the same
     reason typeElementText() above has none. */
  function eraseElementText(el, speed, chunk, token) {
    return new Promise(function (resolve) {
      function step() {
        if (!isCurrent(token)) { el.textContent = ''; resolve(); return; }

        var current = el.textContent;
        if (!current.length) { resolve(); return; }

        el.textContent = current.slice(0, Math.max(0, current.length - chunk));

        var timer = setTimeout(step, speed);
        typeState.wake = function () { clearTimeout(timer); typeState.wake = null; el.textContent = ''; resolve(); };
      }
      step();
    });
  }

  /* --- Type-in (the page's "intro") --------------------------------------
     Fire-and-forget from showPage(): clears every typed element, waits for
     the term-window's own fade-in to finish, then types each element in
     turn. Reduced motion skips straight to the finished state. */
  async function runPageTypeIn(page) {
    var items = getTypedElements(page);
    if (!items.length) { return; }

    var token = beginSequence();
    items.forEach(function (el) { el.textContent = ''; });

    var video = page.querySelector('.term-window__video');
    if (video) { video.classList.remove('is-typed-in'); }

    if (prefersReducedMotion()) {
      items.forEach(function (el) { el.textContent = TYPEWRITER_TEXT.get(el) || ''; });
      if (video) { video.classList.add('is-typed-in'); }
      return;
    }

    var termWindow = page.querySelector('.term-window');
    if (termWindow) { termWindow.classList.add('is-typing'); }

    try {
      await typeSleep(WINDOW_REVEAL_MS);
      typeCheckpoint(token);

      for (var i = 0; i < items.length; i++) {
        await typeElementText(items[i], TYPE_SPEED, token);
        typeCheckpoint(token);
        await typeSleep(140);
        typeCheckpoint(token);
      }
      if (video) { video.classList.add('is-typed-in'); }
    } catch (e) {
      if (e !== TYPE_ABORT) { throw e; }
    } finally {
      if (termWindow) { termWindow.classList.remove('is-typing'); }
    }
  }

  /* Instantly completes whatever's currently typing — the "click to skip"
     affordance (see the document click listener further down), and also
     called defensively at the start of leaving a typed page (see
     showConsole()) to guarantee any in-flight type-in is fully stopped
     before the erase sequence begins. beginSequence() is what actually
     invalidates it; the DOM fill here just makes that visible immediately
     instead of waiting for the (now-doomed) sequence's own cleanup. */
  function skipPageTypeIn(page) {
    beginSequence();
    if (typeState.wake) { typeState.wake(); }

    getTypedElements(page).forEach(function (el) {
      el.textContent = TYPEWRITER_TEXT.get(el) || '';
    });

    var video = page.querySelector('.term-window__video');
    if (video) { video.classList.add('is-typed-in'); }

    var termWindow = page.querySelector('.term-window');
    if (termWindow) { termWindow.classList.remove('is-typing'); }
  }

  /* --- Erase-out (the page's "outro") -------------------------------------
     Called from showConsole()'s outro handling. Erases in reverse order —
     video card first, then last paragraph back up to the heading — so it
     reads as "closing from the bottom", the mirror image of typing in. */
  async function runPageEraseOut(page) {
    var items = getTypedElements(page);
    if (!items.length) { return; }

    var token = beginSequence();

    if (prefersReducedMotion()) {
      items.forEach(function (el) { el.textContent = ''; });
      var videoRM = page.querySelector('.term-window__video');
      if (videoRM) { videoRM.classList.remove('is-typed-in'); }
      return;
    }

    try {
      var video = page.querySelector('.term-window__video');
      if (video) {
        video.classList.remove('is-typed-in');
        await typeSleep(160);
        typeCheckpoint(token);
      }

      for (var i = items.length - 1; i >= 0; i--) {
        await eraseElementText(items[i], ERASE_SPEED, ERASE_CHUNK, token);
        typeCheckpoint(token);
      }
    } catch (e) {
      if (e !== TYPE_ABORT) { throw e; }
    }
  }

  /* Instantly finishes erasing — the "skip" side of leaving a page, fired
     by a second Esc/back while the outro is already running. */
  function skipPageEraseOut(page) {
    beginSequence();
    if (typeState.wake) { typeState.wake(); }

    getTypedElements(page).forEach(function (el) { el.textContent = ''; });

    var video = page.querySelector('.term-window__video');
    if (video) { video.classList.remove('is-typed-in'); }
  }


  /* --------------------------------------------------------------------------
     02. SCREEN SWITCHING
  -------------------------------------------------------------------------- */

  function findPage(pageId) {
    return el.pages.filter(function (page) {
      return page.getAttribute('data-page') === pageId;
    })[0] || null;
  }

  function showPage(pageId) {
    var page = findPage(pageId);
    if (!page) { return; }

    el.console.classList.remove('is-active');
    page.classList.add('is-active');
    activePage = page;

    /* Reset the reveal, force a reflow so the browser "notices" the class
       is gone, then re-add it. Without the reflow the remove+add would be
       batched into a single style recalc and the transition would not
       replay on a second visit to the same page. */
    page.classList.remove('is-revealed');
    void page.offsetWidth; /* eslint-disable-line no-unused-expressions */
    page.classList.add('is-revealed');

    page.scrollTop = 0;
    clearFeedback();

    /* No typing happens on a content page, so the sound toggle has nothing
       to control here — hidden until showConsole() below brings it back. */
    if (el.soundBtn) { el.soundBtn.setAttribute('hidden', ''); }

    /* Hand off to the Stage 3 background-animation module, if present.
       Defined as a separate IIFE further down the file, but since all of
       this file's IIFEs run synchronously on load, window.D7Backgrounds is
       guaranteed to exist by the time any of this fires from a user action.
       stopAll() first in case a future route ever jumps page-to-page
       directly, so two loops can never run at once. */
    if (window.D7Backgrounds) {
      window.D7Backgrounds.stopAll();
      window.D7Backgrounds.start(pageId);
    }

    /* The page's text "intro" — fire-and-forget; runPageTypeIn() is a no-op
       on the references page (isTypedPage() is false there), which keeps
       its existing CSS fade-stagger untouched. */
    runPageTypeIn(page);
  }

  var OUTRO_MS = 260;      /* CSS-only outro duration (the references page) */
  var isLeaving = false;   /* an outro — either kind — is currently running */
  var pageBeingClosed = null;
  var cssOutroTimer = null;

  /* Leaving a page has two different outros, chosen by isTypedPage():
       - typed pages (data breach / iam / malware) erase their text back
         out (runPageEraseOut, variable duration)
       - the references page keeps the original CSS-only fade (OUTRO_MS)
     A second Esc/back/logo-click while either is already running skips
     straight through instead of queuing a second one — see skipOutro(). */
  function showConsole() {
    if (isLeaving) { skipOutro(); return; }
    if (!activePage) { finishShowConsole(); return; }

    pageBeingClosed = activePage;
    activePage = null;
    isLeaving = true;

    if (isTypedPage(pageBeingClosed)) {
      /* Deliberately NOT adding .is-leaving here. That class fades the
         whole term-window box to invisible in ~240ms (see styles.css) —
         fine for the references page's instant CSS outro below, but for a
         typed page the character erase running underneath takes much
         longer than 240ms, so the box would vanish almost immediately and
         then sit invisible for another couple of seconds while the erase
         kept running unseen behind it. The erase IS the visible outro
         here; the window stays up throughout it, and the normal .screen
         cross-fade (700ms, unconditional, not this class) handles the
         final disappearance once finalizeOutro() removes .is-active. */

      /* If the page is still mid-type-in when the user leaves, force it to
         its finished state FIRST. Without this, runPageTypeIn()'s pending
         timers would keep running concurrently with the erase sequence
         below — both fighting over the same shared typeState.wake and the
         same elements' textContent at once. skipPageTypeIn() is a no-op
         (besides an idempotent full-text fill) if typing had already
         finished naturally, so this is always safe to call. */
      skipPageTypeIn(pageBeingClosed);
      runPageEraseOut(pageBeingClosed).then(finalizeOutro);
    } else if (prefersReducedMotion()) {
      finalizeOutro();
    } else {
      pageBeingClosed.classList.add('is-leaving');
      cssOutroTimer = setTimeout(finalizeOutro, OUTRO_MS);
    }
  }

  function skipOutro() {
    if (!pageBeingClosed) { return; }

    if (isTypedPage(pageBeingClosed)) {
      /* Forces the erase to its finished state; runPageEraseOut()'s promise
         (already chained to finalizeOutro via .then in showConsole above)
         resolves naturally right after this, so finalizeOutro is NOT
         called here directly — that would run it twice. */
      skipPageEraseOut(pageBeingClosed);
    } else if (cssOutroTimer) {
      clearTimeout(cssOutroTimer);
      cssOutroTimer = null;
      finalizeOutro();
    }
  }

  function finalizeOutro() {
    pageBeingClosed.classList.remove('is-active', 'is-leaving', 'is-revealed');
    pageBeingClosed = null;
    isLeaving = false;
    cssOutroTimer = null;
    finishShowConsole();
  }

  function finishShowConsole() {
    el.console.classList.add('is-active');
    el.input.value = '';
    updateGhost();
    updateCaretPosition();
    clearFeedback();
    /* Return focus to the command line so the user can type again straight
       away, without forcing a click first. */
    el.input.focus();

    /* The sound toggle is relevant again now that the command line is
       back — un-hide it (a no-op if it was already visible). */
    if (el.soundBtn) { el.soundBtn.removeAttribute('hidden'); }

    if (window.D7Backgrounds) { window.D7Backgrounds.stopAll(); }
  }


  /* --------------------------------------------------------------------------
     03. COMMAND HANDLING
  -------------------------------------------------------------------------- */

  function clearFeedback() {
    el.feedback.textContent = '';
    el.feedback.classList.remove('is-visible', 'is-info');
  }

  /* Unrecognised-command warning — amber, via the default .console__feedback
     colour (see styles.css). */
  function showFeedback(message) {
    el.feedback.textContent = message;
    el.feedback.classList.remove('is-info');
    el.feedback.classList.add('is-visible');
  }

  /* "help" response — same line, but cyan/informational rather than a
     warning (.is-info overrides the default amber). */
  /* The response is built as HTML (not textContent) so each command is a
     real clickable [data-cmd] word, same as the hint line and every page's
     "back" prompt — the existing document-level click listener further
     down already handles these for free, nothing extra to wire up. Safe to
     use innerHTML here since every character comes from this fixed string,
     never from the user's own input. */
  function showHelp() {
    el.feedback.innerHTML =
      'here’s what you can open: ' +
      '<span data-cmd="data breach">data breach</span> · ' +
      '<span data-cmd="iam">iam</span> · ' +
      '<span data-cmd="malware">malware</span> · ' +
      '<span data-cmd="about">about</span> ' +
      '— click a word or type it, either works';
    el.feedback.classList.add('is-visible', 'is-info');
  }

  function runCommand(raw) {
    var result = resolveCommand(raw);

    if (result) {
      commandCount++;
      if (el.counter) { el.counter.textContent = String(commandCount); }
    }

    if (result === 'BACK') {
      /* isLeaving as well as activePage: activePage is nulled the instant
         an outro starts (see showConsole()), so without this a second
         "back" fired mid-outro — clicking the logo or the prompt's "back"
         word again — would silently do nothing instead of reaching
         showConsole()'s own skip-the-outro handling. */
      if (activePage || isLeaving) { showConsole(); }
      return;
    }

    if (result === 'HELP') {
      /* Console-only — the command line itself is hidden on content pages,
         so this is never reachable from there anyway. */
      if (!activePage) { showHelp(); }
      return;
    }

    if (result) {
      showPage(result);
      return;
    }

    /* Unrecognised input: on the console, hint at the valid commands. While
       a page is open, an unrecognised command is just ignored (the user is
       reading, not necessarily trying to navigate). */
    if (!activePage) {
      showFeedback('command not recognised — try: data breach / iam / malware / about');
    }
  }


  /* --------------------------------------------------------------------------
     04. EVENT WIRING
  -------------------------------------------------------------------------- */

  el.form.addEventListener('submit', function (event) {
    event.preventDefault();
    runCommand(el.input.value);
    el.input.value = '';
    updateGhost();
    updateCaretPosition();
  });

  /* Tab-completion, like a real shell: partial "mal" + Tab -> "malware".
     Completes against the primary command words shown in the hint line
     (not every alias — completing to a word the user can actually see
     listed is what makes this discoverable rather than a guessing game).
     Multiple matches complete to their longest common prefix instead of
     doing nothing; with this small a command set that's rare in practice
     (every command happens to start with a different letter), but it's a
     reasonable fallback if the list ever grows.

     el.ghost (see the HTML/CSS) previews what Tab would do, before you
     press it — only shown when there's exactly one match, since a
     longest-common-prefix result isn't really "the" suggestion. */
  var TAB_COMPLETIONS = ['data breach', 'iam', 'malware', 'about', 'back', 'help'];

  function getCompletionMatches(value) {
    return TAB_COMPLETIONS.filter(function (word) { return word.indexOf(value) === 0; });
  }

  function longestCommonPrefix(words) {
    var prefix = words[0];
    for (var i = 1; i < words.length; i++) {
      while (words[i].indexOf(prefix) !== 0) {
        prefix = prefix.slice(0, -1);
        if (!prefix) { return ''; }
      }
    }
    return prefix;
  }

  function updateGhost() {
    if (!el.ghost) { return; }

    var value = normalise(el.input.value);
    if (!value) { el.ghost.textContent = ''; return; }

    var matches = getCompletionMatches(value);
    /* Full completion string, not just the remainder — the CSS overlap
       trick (see .console__ghost) relies on the ghost's leading
       characters matching what's already typed, so the input's own
       opaque text can sit on top of them and hide them. */
    el.ghost.textContent = (matches.length === 1 && matches[0] !== value) ? matches[0] : '';
  }

  /* --------------------------------------------------------------------------
     01c. CARET TRACKING
     #console-caret is a styled element (glowing box, blink animation — see
     styles.css), not the input's native cursor, so it needed a way to know
     the real cursor's pixel position. There's no built-in API for "where is
     the text cursor, in pixels" on a plain <input>, so this measures it
     manually: a hidden span (`caretMirror`), styled with the exact same
     font as the input, is filled with the substring up to the cursor
     (`selectionStart`) and its rendered width becomes the caret's `left`.
     Since the caret sits in the same position:relative wrapper as the
     input, with no padding offset between them, that measured width lines
     up with the real cursor pixel-for-pixel.
  -------------------------------------------------------------------------- */

  var caretMirror = document.createElement('span');
  caretMirror.style.position = 'absolute';
  caretMirror.style.visibility = 'hidden';
  caretMirror.style.whiteSpace = 'pre';
  caretMirror.style.top = '-9999px';
  caretMirror.style.left = '-9999px';
  document.body.appendChild(caretMirror);

  function syncCaretMirrorFont() {
    var computed = window.getComputedStyle(el.input);
    caretMirror.style.fontFamily = computed.fontFamily;
    caretMirror.style.fontSize = computed.fontSize;
    caretMirror.style.fontWeight = computed.fontWeight;
    caretMirror.style.letterSpacing = computed.letterSpacing;
  }

  function updateCaretPosition() {
    if (!el.caret) { return; }

    var cursor = el.input.selectionStart;
    if (cursor === null || cursor === undefined) { cursor = el.input.value.length; }

    caretMirror.textContent = el.input.value.slice(0, cursor);
    el.caret.style.left = caretMirror.getBoundingClientRect().width + 'px';
  }

  /* Solid while characters are actively being typed, blinking once typing
     pauses — same idea as the intro's own caret, just driven by a short
     idle timer here instead of the intro's own scripted timeline, since
     real typing doesn't have a predetermined rhythm to hook into. */
  var caretIdleTimer = null;
  function markCaretTyping() {
    if (!el.caret) { return; }
    el.caret.classList.add('is-typing');
    clearTimeout(caretIdleTimer);
    caretIdleTimer = setTimeout(function () {
      el.caret.classList.remove('is-typing');
    }, 500);
  }

  if (el.caret) {
    syncCaretMirrorFont();
    updateCaretPosition();
    /* The font-size uses a clamp(), so it can change across the same
       session on window resize — keep the mirror in step with it. */
    window.addEventListener('resize', function () {
      syncCaretMirrorFont();
      updateCaretPosition();
    });
  }

  /* Same typing-click sound as the intro's typewriter, on real keystrokes
     this time. 'input' fires once per value change (character typed,
     deleted, or pasted), which is a good enough proxy for "typing" without
     hand-filtering individual key codes. Also keeps the ghost preview and
     the caret's position in sync with every change, not just Tab presses. */
  el.input.addEventListener('input', function () {
    if (window.D7Sound) { window.D7Sound.play(); }
    updateGhost();
    updateCaretPosition();
    markCaretTyping();
  });

  /* Cursor can also move without the value changing — arrow keys, Home/
     End, or clicking partway through the text — none of which fire
     'input'. 'keyup' catches the former; 'click' catches the latter. */
  el.input.addEventListener('keyup', updateCaretPosition);
  el.input.addEventListener('click', updateCaretPosition);
  el.input.addEventListener('focus', updateCaretPosition);

  el.input.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab') { return; }
    event.preventDefault();   /* don't let focus tab away from the input */

    var value = normalise(el.input.value);
    if (!value) { return; }

    var matches = getCompletionMatches(value);
    if (!matches.length) { return; }

    var completion = matches.length === 1 ? matches[0] : longestCommonPrefix(matches);
    if (completion && completion !== value) {
      el.input.value = completion;
      if (window.D7Sound) { window.D7Sound.play(); }   /* setting .value directly doesn't fire 'input', so this needs its own sound cue */
    }
    /* setting .value directly doesn't fire 'input' either — same reason
       these need their own calls too. */
    updateGhost();
    updateCaretPosition();
  });

  /* Clicking a highlighted word (in the hint line or a page's return prompt)
     runs that command directly — a mouse-friendly shortcut alongside typing. */
  document.addEventListener('click', function (event) {
    var target = event.target.closest ? event.target.closest('[data-cmd]') : null;
    if (!target) { return; }
    runCommand(target.getAttribute('data-cmd'));
    el.input.focus();
  });

  /* Anywhere-click skips straight to the finished text while a page's
     content is still typing in — the ".is-typing" hint (see styles.css)
     is what tells the user this works. Guarded to only fire while typing
     is actually in progress, so it never interferes with a normal click
     on "back" or the video card once the text has settled.

     Also skips entirely for clicks on a [data-cmd] word. Without that
     exclusion, clicking a command (rather than typing it) would trigger
     THIS listener too, on the exact same click: the [data-cmd] handler
     above runs first, calls showPage(), which calls runPageTypeIn() —
     and since everything before that function's first `await` runs
     synchronously, including adding .is-typing, by the time THIS listener
     runs (same click, later in the chain) it sees typing already "in
     progress" on the very click that just started it, and immediately
     skips the intro before it's played at all. */
  document.addEventListener('click', function (event) {
    if (!activePage) { return; }
    if (event.target.closest && event.target.closest('[data-cmd]')) { return; }
    var termWindow = activePage.querySelector('.term-window.is-typing');
    if (termWindow) { skipPageTypeIn(activePage); }
  });

  /* Esc returns to the console from any open page, and a second Esc fired
     while the outro is already running skips straight through it —
     showConsole() itself handles that branch (isLeaving check). Checking
     isLeaving here too matters because activePage is nulled the instant
     an outro starts, so activePage alone would miss that second press. */
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && (activePage || isLeaving)) { showConsole(); }
  });

})();


/* ============================================================================
   STAGE 3: PAGE BACKGROUND ANIMATIONS

   One <canvas> per content page (see .page__bg in the HTML), each drawn by
   a small self-contained "draw" function. The router (Stage 2) starts the
   matching animation when a page opens and stops it when the page closes,
   via the window.D7Backgrounds.start/stop/stopAll API defined below — only
   the currently-open page's canvas is ever actually animating.

   Under prefers-reduced-motion, every page draws exactly one frame and does
   not loop, matching how the intro handles the same preference.

   Contents:
     00. Engine (registry, resize, start/stop, public API)
     01. Data breach  — falling fragments
     02. IAM          — pulsing access-point grid
     03. Malware      — spreading infection graph
     04. Wiring
   ========================================================================== */

(function () {
  'use strict';

  function prefersReducedMotion() {
    return window.matchMedia &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* --------------------------------------------------------------------------
     00. ENGINE
  -------------------------------------------------------------------------- */

  var registry = {};   // pageId -> { canvas, ctx, raf, state, createState, draw }

  function register(pageId, canvas, createState, draw) {
    registry[pageId] = {
      canvas: canvas,
      ctx: canvas.getContext('2d'),
      raf: null,
      state: null,
      createState: createState,
      draw: draw
    };
  }

  /* Matches the canvas's drawing-buffer resolution to its on-screen size
     (accounting for device pixel ratio, capped at 2x so a 4K/5K display
     doesn't push unnecessary pixel-pushing work). setTransform (rather than
     ctx.scale) is used so repeated resizes never compound the scale. */
  function resize(entry) {
    var rect = entry.canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    entry.canvas.width = Math.round(rect.width * dpr);
    entry.canvas.height = Math.round(rect.height * dpr);
    entry.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function start(pageId) {
    var entry = registry[pageId];
    if (!entry) { return; }

    resize(entry);
    if (!entry.state) { entry.state = entry.createState(); }

    if (prefersReducedMotion()) {
      /* One static frame, no loop — texture without motion. */
      entry.draw(entry.ctx, entry.canvas.clientWidth, entry.canvas.clientHeight, entry.state, 0);
      return;
    }

    var startTime = null;
    function frame(t) {
      if (startTime === null) { startTime = t; }
      entry.draw(entry.ctx, entry.canvas.clientWidth, entry.canvas.clientHeight, entry.state, t - startTime);
      entry.raf = requestAnimationFrame(frame);
    }
    entry.raf = requestAnimationFrame(frame);
  }

  function stop(pageId) {
    var entry = registry[pageId];
    if (!entry || entry.raf === null) { return; }
    cancelAnimationFrame(entry.raf);
    entry.raf = null;
  }

  function stopAll() {
    for (var id in registry) { stop(id); }
  }

  /* Only the active page's canvas needs to track window resizes live; an
     inactive one is simply re-measured the next time start() runs. */
  window.addEventListener('resize', function () {
    for (var id in registry) {
      if (registry[id].raf !== null) { resize(registry[id]); }
    }
  });

  window.D7Backgrounds = { start: start, stop: stop, stopAll: stopAll };


  /* --------------------------------------------------------------------------
     01. DATA BREACH — falling fragments
     Small broken-bracket glyphs drifting downward at slightly different
     speeds, like debris (or leaking data) falling out of the page.
     Positions are stored as 0-1 fractions of width/height so a window
     resize never requires regenerating the particle set.
  -------------------------------------------------------------------------- */

  function createFragments() {
    var particles = [];
    var count = 56;
    for (var i = 0; i < count; i++) {
      /* Bigger fragments are treated as "closer" — slower, more opaque, a
         touch of glow — which gives the field some depth instead of every
         piece reading as the same distance. */
      var depth = Math.random();
      particles.push({
        x: Math.random(),
        y: Math.random(),
        size: 4 + depth * 7,
        speed: 0.05 - depth * 0.022 + Math.random() * 0.02,   // fraction of height / second
        drift: (Math.random() - 0.5) * 0.025,                 // slight horizontal wander
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.6,
        depth: depth,
        amber: Math.random() < 0.35
      });
    }
    return { particles: particles, lastT: 0 };
  }

  function drawFragments(ctx, w, h, state, elapsedMs) {
    var dt = Math.max(0, Math.min((elapsedMs - state.lastT) / 1000, 0.05));
    state.lastT = elapsedMs;

    ctx.clearRect(0, 0, w, h);

    state.particles.forEach(function (p) {
      p.y += p.speed * dt;
      p.x += p.drift * dt;
      p.rot += p.rotSpeed * dt;

      if (p.y > 1.08) { p.y = -0.08; p.x = Math.random(); }
      if (p.x > 1.05) { p.x = -0.05; }
      if (p.x < -0.05) { p.x = 1.05; }

      var px = p.x * w;
      var py = p.y * h;
      var alpha = 0.4 + p.depth * 0.4;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.rot);
      ctx.strokeStyle = p.amber
        ? 'rgba(255, 180, 84, ' + alpha.toFixed(3) + ')'
        : 'rgba(70, 230, 208, ' + alpha.toFixed(3) + ')';
      ctx.lineWidth = 1.6 + p.depth * 0.8;
      ctx.shadowColor = p.amber ? 'rgba(255, 180, 84, 0.5)' : 'rgba(70, 230, 208, 0.5)';
      ctx.shadowBlur = 3 + p.depth * 5;

      /* Two opposite bracket-corners — reads as a "broken" fragment rather
         than a solid shape. */
      ctx.beginPath();
      ctx.moveTo(-p.size, -p.size * 0.4);
      ctx.lineTo(-p.size, -p.size);
      ctx.lineTo(-p.size * 0.4, -p.size);
      ctx.moveTo(p.size * 0.4, p.size);
      ctx.lineTo(p.size, p.size);
      ctx.lineTo(p.size, p.size * 0.4);
      ctx.stroke();
      ctx.restore();
    });
  }


  /* --------------------------------------------------------------------------
     02. IAM — pulsing access-point grid
     A grid of small squares whose brightness is a travelling sine wave —
     reads as access points lighting up and dimming in sequence, like a
     scanner sweeping the grid. Entirely stateless: the layout is derived
     from the canvas size fresh each frame, so resizing needs no reset.
  -------------------------------------------------------------------------- */

  function createGrid() {
    return {};
  }

  function drawGrid(ctx, w, h, state, elapsedMs) {
    ctx.clearRect(0, 0, w, h);

    var spacing = 46;
    var cols = Math.ceil(w / spacing) + 1;
    var rows = Math.ceil(h / spacing) + 1;
    var t = elapsedMs / 1000;

    /* A faint permanent lattice, dimly visible even where the wave hasn't
       reached — reads as "the grid is always there, the scan is what lights
       it up" rather than dots appearing from nothing. */
    ctx.fillStyle = 'rgba(70, 230, 208, 0.05)';
    for (var gc = 0; gc < cols; gc++) {
      for (var gr = 0; gr < rows; gr++) {
        ctx.fillRect(gc * spacing - 1, gr * spacing - 1, 2, 2);
      }
    }

    for (var col = 0; col < cols; col++) {
      for (var row = 0; row < rows; row++) {
        var phase = (col + row) * 0.35;
        var wave = Math.max(0, Math.sin(t * 1.1 - phase));
        var brightness = wave * wave;   // squared to sharpen the pulse

        if (brightness < 0.02) { continue; }

        var x = col * spacing;
        var y = row * spacing;
        var size = 3 + brightness * 5.5;

        ctx.fillStyle = 'rgba(70, 230, 208, ' + (brightness * 0.75).toFixed(3) + ')';
        ctx.shadowColor = 'rgba(70, 230, 208, 0.65)';
        ctx.shadowBlur = 6 * brightness;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
        ctx.shadowBlur = 0;

        /* The brightest points also get an amber outline, like the reader
           confirming a hit. */
        if (brightness > 0.5) {
          ctx.strokeStyle = 'rgba(255, 180, 84, ' + ((brightness - 0.5) * 0.9).toFixed(3) + ')';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(x - size, y - size, size * 2, size * 2);
        }
      }
    }
  }


  /* --------------------------------------------------------------------------
     03. MALWARE — spreading infection graph
     A small fixed network: nodes connected to their two nearest neighbours.
     A single "patient zero" infects outward through the graph (breadth-
     first, so it spreads through connections rather than randomly), holds
     at full infection, fades back to clean, pauses, then loops.

     Node layout and the patient-zero index are hand-fixed (not randomised)
     so the animation is identical on every load — a predictable, reviewed
     result rather than a different graph each visit.
  -------------------------------------------------------------------------- */

  /* Normalised (0-1) positions — patient zero (index 0) sits centrally so
     the infection has room to spread outward in every direction. */
  var GRAPH_NODES = [
    { x: 0.50, y: 0.50 },
    { x: 0.30, y: 0.30 }, { x: 0.68, y: 0.28 }, { x: 0.18, y: 0.55 },
    { x: 0.82, y: 0.52 }, { x: 0.35, y: 0.75 }, { x: 0.65, y: 0.78 },
    { x: 0.12, y: 0.18 }, { x: 0.88, y: 0.20 }, { x: 0.50, y: 0.15 },
    { x: 0.50, y: 0.85 }, { x: 0.20, y: 0.85 }, { x: 0.80, y: 0.85 },
    { x: 0.10, y: 0.70 }, { x: 0.90, y: 0.68 }
  ];
  var GRAPH_PATIENT_ZERO = 0;

  function createGraph() {
    var nodes = GRAPH_NODES;
    var n = nodes.length;

    /* Connect each node to its two nearest neighbours, deduplicating so an
       edge isn't drawn twice. Deterministic — same inputs, same graph. */
    var edges = [];
    var edgeSeen = {};
    nodes.forEach(function (a, i) {
      var byDistance = nodes
        .map(function (b, j) {
          return { j: j, d: i === j ? Infinity : Math.hypot(a.x - b.x, a.y - b.y) };
        })
        .sort(function (p, q) { return p.d - q.d; });

      for (var k = 0; k < 2; k++) {
        var j = byDistance[k].j;
        var key = Math.min(i, j) + '-' + Math.max(i, j);
        if (!edgeSeen[key]) { edgeSeen[key] = true; edges.push([i, j]); }
      }
    });

    var adjacency = nodes.map(function () { return []; });
    edges.forEach(function (e) {
      adjacency[e[0]].push(e[1]);
      adjacency[e[1]].push(e[0]);
    });

    /* Breadth-first infection timeline from the fixed patient zero, so the
       spread visibly follows the graph's connections. */
    var patientZero = GRAPH_PATIENT_ZERO;
    var infectAt = new Array(n).fill(null);
    var queue = [patientZero];
    infectAt[patientZero] = 0;
    var STEP_MS = 420;

    while (queue.length) {
      var current = queue.shift();
      adjacency[current].forEach(function (next) {
        if (infectAt[next] === null) {
          infectAt[next] = infectAt[current] + STEP_MS;
          queue.push(next);
        }
      });
    }

    var lastInfection = Math.max.apply(null, infectAt);
    var HOLD_MS = 1400;    // how long the graph stays fully infected
    var FADE_MS = 700;     // how long it takes to heal back to clean
    var TAIL_MS = 900;     // pause on the clean graph before looping

    return {
      nodes: nodes,
      edges: edges,
      infectAt: infectAt,
      holdEnd: lastInfection + HOLD_MS,
      fadeEnd: lastInfection + HOLD_MS + FADE_MS,
      cycle: lastInfection + HOLD_MS + FADE_MS + TAIL_MS
    };
  }

  function drawGraph(ctx, w, h, state, elapsedMs) {
    ctx.clearRect(0, 0, w, h);
    var t = elapsedMs % state.cycle;

    /* Ramps every node's infection back to 0 together during the final
       fade window, so the whole graph "heals" in sync before the loop
       restarts, rather than nodes clearing at scattered times. */
    var globalFade = 1;
    if (t > state.holdEnd) {
      globalFade = 1 - Math.min(1, (t - state.holdEnd) / (state.fadeEnd - state.holdEnd));
    }

    state.edges.forEach(function (e) {
      var a = state.nodes[e[0]];
      var b = state.nodes[e[1]];
      ctx.strokeStyle = 'rgba(70, 230, 208, 0.32)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    });

    var cyan = [70, 230, 208];
    var red  = [255, 90, 90];

    state.nodes.forEach(function (node, i) {
      var since = t - state.infectAt[i];
      var infected = since > 0 ? Math.min(1, since / 300) * globalFade : 0;

      var radius = 3.6 + infected * 3;
      var mixed = cyan.map(function (c, idx) { return Math.round(c + (red[idx] - c) * infected); });

      ctx.beginPath();
      ctx.fillStyle = 'rgba(' + mixed.join(',') + ', ' + (0.55 + infected * 0.45).toFixed(3) + ')';
      if (infected > 0.05) {
        ctx.shadowColor = 'rgba(255, 90, 90, ' + (infected * 0.75).toFixed(3) + ')';
        ctx.shadowBlur = 15 * infected;
      } else {
        ctx.shadowColor = 'rgba(70, 230, 208, 0.4)';
        ctx.shadowBlur = 4;
      }
      ctx.arc(node.x * w, node.y * h, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }


  /* --------------------------------------------------------------------------
     04. WIRING
     Matches each page's canvas to its animation by the page's data-page
     attribute. The "about" page has no canvas in the HTML, so it's simply
     skipped here.
  -------------------------------------------------------------------------- */

  Array.prototype.slice.call(document.querySelectorAll('.screen--page')).forEach(function (page) {
    var canvas = page.querySelector('.page__bg');
    var pageId = page.getAttribute('data-page');
    if (!canvas || !pageId) { return; }

    if (pageId === 'databreach') { register(pageId, canvas, createFragments, drawFragments); }
    else if (pageId === 'iam')   { register(pageId, canvas, createGrid, drawGrid); }
    else if (pageId === 'malware') { register(pageId, canvas, createGraph, drawGraph); }
  });

})();


/* ============================================================================
   STAGE 4: VIDEO CONTROLLER (data breach page)

   The embedded YouTube video starts muted (a browser requirement for any
   autoplay) and is played/paused automatically as it scrolls in and out of
   view, via IntersectionObserver + the YouTube postMessage command API
   (enablejsapi=1 on the iframe's src is what allows this — see the HTML).
   No YouTube script is loaded; posting directly to the already-embedded
   player is enough, so this stays "no external dependencies".

   Under prefers-reduced-motion, scroll-triggered autoplay is skipped
   entirely — the video just sits there as a normal embed the user presses
   play on themselves.

   NOTE: the data breach page currently shows a "watch on YouTube" fallback
   card instead of a real embed (its video has embedding disabled by the
   owner — see the HTML comment above the markup). That fallback has no
   [data-yt-iframe] element, so this whole module is a deliberate no-op
   until a working, embeddable video ID is swapped back in.
   ========================================================================== */

(function () {
  'use strict';

  function prefersReducedMotion() {
    return window.matchMedia &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  var wrap = document.querySelector('[data-yt-video]');
  if (!wrap) { return; }

  var iframe = wrap.querySelector('[data-yt-iframe]');
  if (!iframe) { return; }   /* fallback link markup, not a real embed — see NOTE above */

  var unmuteBtn     = wrap.querySelector('[data-yt-unmute]');
  var unmuteLabel   = wrap.querySelector('[data-yt-unmute-label]');
  var unmuteIcon    = wrap.querySelector('.term-window__video-unmute-icon');

  var state = { loaded: false, wantPlay: false, muted: true };

  function sendCommand(func, args) {
    if (!iframe.contentWindow) { return; }
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: func, args: args || [] }),
      '*'
    );
  }

  /* postMessage commands sent before the player has finished loading are
     silently dropped, so a "wantPlay" intent is queued and flushed on load. */
  iframe.addEventListener('load', function () {
    state.loaded = true;
    if (state.wantPlay) { sendCommand('playVideo'); }
  });

  if (!prefersReducedMotion() && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        state.wantPlay = entry.isIntersecting;
        if (!state.loaded) { return; }
        sendCommand(entry.isIntersecting ? 'playVideo' : 'pauseVideo');
      });
    }, { threshold: 0.5 });
    observer.observe(wrap);
  }

  unmuteBtn.addEventListener('click', function () {
    state.muted = !state.muted;
    sendCommand(state.muted ? 'mute' : 'unMute');
    if (!state.muted) { sendCommand('setVolume', [100]); }

    unmuteBtn.setAttribute('aria-pressed', String(!state.muted));
    unmuteLabel.textContent = state.muted ? 'unmute' : 'mute';
    unmuteIcon.textContent = state.muted ? '\u{1F508}' : '\u{1F50A}';
  });

})();
