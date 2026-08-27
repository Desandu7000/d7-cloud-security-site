/* ============================================================================
   D7 - Cloud Computing and Security Issues
   script.js

   This whole file is basically split into "stages" - each one is a chunk of
   code wrapped in its own function that runs itself straight away, so the
   variables inside don't leak into the other stages and mess things up.

   STAGE 0: TYPING SOUND

   Makes a little "click" sound when the title/console text is typing in.
   window.D7Sound.play() is how the rest of the file triggers it. The
   bullet-point text on the actual content pages does NOT play this sound
   (I turned it off there on purpose) because typing a whole paragraph with
   a click on every letter just sounded like noise, not like typing.

   I didn't use a sound file for this - it's generated in the browser using
   the Web Audio API (basically just a short burst of static filtered down
   to sound like a key click). Saves having to upload an audio file.

   It starts off muted unless you already switched it on last time you
   visited (saved using localStorage - see the note further down about why
   I used that instead of a cookie). Browsers also won't let a website play
   any sound at all until you've clicked something on the page first, so
   turning the switch on is also what "unlocks" the audio for the browser.
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'd7-sound-on';
  var soundState = { ctx: null, muted: true };

  try {
    if (window.localStorage.getItem(STORAGE_KEY) === '1') { soundState.muted = false; }
  } catch (e) { /* localStorage unavailable (e.g. private browsing) - default stands */ }

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
       buffer, then band-passed - this reads as a dry "click" rather than
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

  function unlock() {
    var ctx = ensureAudioContext();
    if (ctx && ctx.state === 'suspended') { ctx.resume(); }
  }

  /* Two copies of this switch exist (the startup gate and the settings
     page) - every element carrying [data-sound-toggle] is wired
     identically here and kept in sync through updateSwitches(), so
     clicking either one updates both, and each independently reflects the
     one shared soundState. */
  var soundBtns = Array.prototype.slice.call(document.querySelectorAll('[data-sound-toggle]'));

  function updateSwitches() {
    soundBtns.forEach(function (btn) {
      btn.setAttribute('aria-checked', String(!soundState.muted));
    });
  }

  function setMuted(muted) {
    /* A switch flipped to "on" is itself a user gesture, so unlocking here
       (rather than only remembering the preference) is what actually lets
       audio play - see unlock() above. */
    if (!muted) { unlock(); }
    soundState.muted = muted;
    try { window.localStorage.setItem(STORAGE_KEY, muted ? '0' : '1'); }
    catch (e) { /* nothing to persist to - the toggle still works for this visit */ }
    updateSwitches();
  }

  soundBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { setMuted(!soundState.muted); });
  });
  updateSwitches();

  window.D7Sound = {
    play: playKeySound,
    /* Called by the gate's Continue click (a guaranteed user gesture)
       so that if sound was already on from a previous visit, this
       session's AudioContext actually gets created/resumed - without it,
       a returning visitor who never touches the switch would have "sound
       on" silently do nothing all session. */
    unlock: unlock,
    get muted() { return soundState.muted; },
    set: setMuted
  };

})();


/* ============================================================================
   STAGE 0b: REDUCE ANIMATIONS SWITCH

   This is a switch I made myself for turning animations off, separate from
   the "reduce motion" setting some people have turned on in their own
   computer/phone settings. Every other part of this file that needs to
   check "should I animate this or not?" just checks window.D7Motion.reduced
   instead of checking the browser setting directly, so there's only one
   place this logic lives.

   I made it default to animations ON even if someone's device settings say
   "reduce motion", because a few of the animations here (like the image
   glitch effect and the scroll effect) are actually part of what I'm being
   marked on for this assignment, not just decoration. So instead of
   guessing what people want, I just give them an actual switch to turn it
   off if they want to. Saved with localStorage (see Stage 0's comment above
   for why not a cookie) so it remembers your choice next time.
   ========================================================================== */

window.D7Motion = (function () {
  'use strict';

  var STORAGE_KEY = 'd7-reduce-motion';
  /* Two copies of this switch exist (the startup gate and the settings
     page), both wired to this one shared state - same pattern as the
     sound switch above. */
  var btns = Array.prototype.slice.call(document.querySelectorAll('[data-motion-toggle]'));
  var state = { reduced: false };

  try {
    var saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === '1') { state.reduced = true; }
  } catch (e) { /* localStorage unavailable (e.g. private browsing) - default stands */ }

  function updateSwitches() {
    btns.forEach(function (btn) {
      btn.setAttribute('aria-checked', String(state.reduced));
    });
  }

  function setReduced(value) {
    state.reduced = !!value;
    try { window.localStorage.setItem(STORAGE_KEY, state.reduced ? '1' : '0'); }
    catch (e) { /* nothing to persist to - the toggle still works for this visit */ }
    updateSwitches();
    /* Every other stage checks window.D7Motion.reduced directly rather than
       listening for this - nothing currently needs to react mid-animation
       to a toggle, only at the start of the next one. Dispatched anyway in
       case that changes later. */
    document.dispatchEvent(new CustomEvent('d7motionchange', { detail: { reduced: state.reduced } }));
  }

  btns.forEach(function (btn) {
    btn.addEventListener('click', function () { setReduced(!state.reduced); });
  });
  updateSwitches();

  return {
    get reduced() { return state.reduced; },
    set: setReduced
  };
})();


/* ============================================================================
   STAGE 0c: STARTUP SCREEN (THE "BEFORE WE START" SCREEN)

   This handles the Continue button on the very first screen you see. The
   intro animation (Stage 1 below) doesn't run by itself anymore - it waits
   for this code to tell it to start (through window.D7StartIntro), which
   only happens once you click Continue.

   I put the sound/animation switches on this screen instead of just
   letting people find the settings page later, because clicking Continue
   is a proper "user click" that the browser will accept for unlocking
   audio. If I waited for someone to discover the settings page on their
   own, the first bit of typing sound would have already tried (and failed)
   to play before that.
   ========================================================================== */

(function () {
  'use strict';

  var gate = document.getElementById('gate');
  var intro = document.getElementById('intro');
  var continueBtn = document.getElementById('gate-continue');
  if (!gate || !intro || !continueBtn) { return; }

  var dismissed = false;

  function dismissGate() {
    if (dismissed) { return; }
    dismissed = true;

    gate.classList.remove('is-active');
    intro.classList.add('is-active');

    /* Guaranteed user gesture - unlocks the AudioContext so a "sound on"
       preference carried over from a previous visit actually plays this
       session too, not just a sound flipped on right here. */
    if (window.D7Sound) { window.D7Sound.unlock(); }

    if (window.D7StartIntro) { window.D7StartIntro(); }
  }

  continueBtn.addEventListener('click', dismissGate);

  /* Enter anywhere on the gate also continues - matches the [enter] hint
     printed on the button, and means someone tabbing through the toggles
     doesn't have to tab all the way to Continue just to press it. */
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && gate.classList.contains('is-active')) { dismissGate(); }
  });
})();


/* ============================================================================
   STAGE 1: the landing intro (the typing title screen you see first).

   This whole animation is written as one function that runs step by step
   using await/sleep, so it reads top to bottom like a list of steps
   instead of a mess of setTimeout calls calling each other.

   What's in this section:
     00. Setup & element references
     01. Small helpers (sleep, skip-able waiting, reduced-motion check)
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
     This is wrapped in a function that calls itself right away (you'll see
     the `})();` at the very bottom), just so none of these variables leak
     out and clash with variables in the other sections of this file.
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
    started:  false,   // true once playIntro() actually begins (see Stage 0c: the
                        // gate defers this) - guards Esc/skip from firing while the
                        // gate is still up, since #intro exists in the DOM the whole time
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
    /* Manual toggle only (see Stage 0b) - deliberately doesn't also check
       the OS-level prefers-reduced-motion media query, since several of
       this site's animations are the design, not just flourish; the
       choice is offered explicitly via the button instead of inferred. */
    return !!(window.D7Motion && window.D7Motion.reduced);
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
    state.started = true;

    /* Reduced-motion path: show the finished state, hold briefly, move on. */
    if (prefersReducedMotion()) {
      bootLogInstant();
      el.bootLog.classList.add('is-dimmed');
      el.linePres.textContent = TEXT_PRESENTS;
      el.lineMain.textContent = TEXT_MAIN;
      el.sub.classList.add('is-visible');
      hideCaret();
      /* The sound toggle stays available even here - it still controls the
         console's own typing sound once the hand-off below completes. */
      await sleep(1800);
      enterConsole();
      return;
    }

    try {
      /* Beat 1 - system boots. */
      await sleep(400);         checkpoint();
      await playBootLog();      checkpoint();
      await sleep(420);         checkpoint();

      /* Beat 2 - boot log recedes, the title takes the stage. */
      el.bootLog.classList.add('is-dimmed');
      await sleep(260);         checkpoint();

      /* Beat 3 - type "D7 presents:" */
      await typeInto(el.linePres, TEXT_PRESENTS, 55);
      checkpoint();
      await sleep(520);         checkpoint();   /* deliberate pause for weight */

      /* Beat 4 - type the main title, a little faster. */
      await typeInto(el.lineMain, TEXT_MAIN, 42);
      checkpoint();
      await sleep(300);         checkpoint();

      /* Beat 5 - caret away, subtitle and rule fade in. */
      hideCaret();
      el.sub.classList.add('is-visible');
      await sleep(1500);        checkpoint();

      /* Beat 6 - dissolve into the console. */
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
       sound toggle stays up - it also controls the console's typing
       sound now, and Stage 2's router takes over managing its visibility
       from here (shown on the console, hidden on content pages). */
    el.skipBtn.setAttribute('hidden', '');

    /* Reveal the site logo - it lives outside both screens and stays up
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
    if (!state.started || state.aborted || state.finished) { return; }
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

  /* Esc also skips - matches the "[esc]" hint printed on the button. */
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !state.finished) { skipIntro(); }
  });

  /* If the window is resized mid-type, re-measure so the caret stays glued
     to the end of the text. */
  window.addEventListener('resize', function () {
    if (state.finished) { return; }
    moveCaretTo(el.lineMain.textContent ? el.lineMain : el.linePres);
  });

  /* Lock scrolling for the gate + intro. The timeline itself doesn't start
     here anymore - Stage 0c's gate holds it until Continue is clicked, so
     that click can also be the user gesture the sound toggle's
     AudioContext needs (see Stage 0). window.D7StartIntro is what Stage 0c
     calls; the direct playIntro() call is only a fallback for the (should
     never happen) case where #gate is missing from the page. */
  el.body.classList.add('is-locked');
  window.D7StartIntro = playIntro;
  if (!document.getElementById('gate')) { playIntro(); }

})();


/* ============================================================================
   STAGE 2: THE CONSOLE + ROUTER

   This is the big one - it handles the command input box and all the page
   switching when you type a command like "home" or "iam". It's in its own
   self-running function, separate from the intro section above, because it
   doesn't need anything from the intro - it just starts working as soon as
   the console screen exists, whether you watched the whole intro or skipped it.

   What's in this section:
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
    bar:       document.getElementById('console-bar'),
    topSlot:   document.getElementById('top-bar-slot'),
    pages:     Array.prototype.slice.call(document.querySelectorAll('.screen--page'))
  };

  /* Bail out quietly if this markup isn't on the page (e.g. a stripped-down
     test page) rather than throwing on a null reference. */
  if (!el.console || !el.form || !el.input) { return; }

  var activePage = null;   // the page <section> currently open, or null
  var commandCount = 0;    // every recognised command, including "back"

  /* #console-bar's original spot, remembered once up front so it can be
     moved back exactly where it came from - see relocateBar() below. */
  var barHome = {
    parent: el.bar ? el.bar.parentNode : null,
    next:   el.bar ? el.bar.nextSibling : null
  };

  /* Physically moves #console-bar - the actual form/ghost/caret/feedback
     element, not a copy - between the console's own layout and the fixed
     top slot used on content pages. Because it's the same DOM node, every
     event listener and all the ghost/caret/tab-completion state already
     wired to it keeps working with no extra setup after the move. */
  function relocateBar(toTop) {
    if (!el.bar) { return; }

    if (toTop) {
      if (el.bar.parentNode !== el.topSlot) { el.topSlot.appendChild(el.bar); }
      el.bar.classList.add('console-bar--pinned');
    } else {
      if (el.bar.parentNode !== barHome.parent) {
        barHome.parent.insertBefore(el.bar, barHome.next);
      }
      el.bar.classList.remove('console-bar--pinned');
    }

    /* .console-bar--pinned shrinks the input's font-size (see styles.css),
       which the caret-tracking mirror doesn't know about on its own -
       without this, the caret would keep measuring against the OLD font
       metrics after a relocation and drift out of alignment. These are
       defined further down but hoisted, so calling them here is safe. */
    if (el.caret) {
      syncCaretMirrorFont();
      updateCaretPosition();
    }
  }

  /* Original full text of every [data-typewriter] element, captured once
     up front - before script.js ever clears any of them for typing -
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
    home:       ['home', 'start', 'welcome', 'index'],
    databreach: ['data breach', 'databreach', 'breach'],
    iam:        ['iam', 'identity and access management', 'identity access management'],
    malware:    ['malware', 'ransomware', 'malware and ransomware'],
    about:      ['about', 'references', 'refs', 'reference', 'summary'],
    settings:   ['settings', 'options', 'preferences']
  };

  /* NB: 'home' is deliberately NOT here - it used to be a synonym for
     "return to console", but it now routes to the actual Home page (see
     ROUTES above), and resolveCommand() checks this list first. */
  var BACK_WORDS = ['back', 'console', 'exit', 'menu'];
  var HELP_WORDS = ['help', '?', 'commands'];

  /* The CSS text-outro transition collapses to ~0ms under reduced motion
     (see styles.css section 10), so showConsole() skips its matching JS
     delay too rather than sitting on a blank-looking page for no reason. */
  function prefersReducedMotion() {
    /* Manual toggle only (see Stage 0b) - deliberately doesn't also check
       the OS-level prefers-reduced-motion media query, since several of
       this site's animations are the design, not just flourish; the
       choice is offered explicitly via the button instead of inferred. */
    return !!(window.D7Motion && window.D7Motion.reduced);
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
     Each content page's body is a SEQUENCE of blocks, in DOM order, each
     either:
       - [data-typewriter]: a heading or paragraph, typed in character-by-
         character and erased the same way in reverse.
       - [data-reveal]: plain content a character typewriter can't sensibly
         type into - the video card, a bullet-point summary list, or (on
         the Summary page) the entire reference section, which contains
         real <em>/<a> markup that typing would have to tear apart and
         rebuild. These fade in/out as a whole block instead, via the
         .is-typed-in class (styled in styles.css), added/removed at
         exactly the right point in the sequence - which is the reason
         this needs to be a single ordered walk rather than "type
         everything, then reveal the extras" (an earlier version of this
         only ever had ONE non-typed block, always last - the video - so
         that shortcut worked; a bullet list or reference section can sit
         in the MIDDLE of the sequence, and needs to wait for whatever
         precedes it to actually finish typing, which takes a variable,
         not-known-in-advance amount of time, before it appears).

     Silent on purpose - see the STAGE 0 comment above for why this doesn't
     use window.D7Sound like the intro/console do.

     Structurally this mirrors the intro's own abortable-sleep pattern
     (Stage 1) closely - same shape, just walking N sequential blocks
     instead of typing one title, and reused for both directions (typing
     in AND erasing out) via one shared abort state, since the two never
     overlap for a given page.
  -------------------------------------------------------------------------- */

  var TYPE_SPEED   = 9;    // ms/char, base (before jitter) - typing in
  var ERASE_SPEED  = 8;    // ms per tick - erasing out
  var ERASE_CHUNK  = 8;    // characters removed per erase tick - leaving should read as quick
  var WINDOW_REVEAL_MS = 900;   // matches the term-window's own CSS fade-in timing

  /* This bit took me a while to get right. At first I just had one
     true/false "aborted" flag to stop the typing when you leave a page
     early. The problem: if you left a page WHILE it was still typing, two
     things tried to run at once - the old typing was still half-finished
     in the background while the new "erase the text" animation started -
     and they both edited the same text at the same time. It looked glitchy,
     like the text was randomly growing and shrinking instead of just
     erasing normally.

     My fix: instead of one shared flag, every new typing/erasing run gets
     its own ID number (see beginSequence() below). Before doing anything,
     each step checks "is my ID still the current one?" - if a newer run
     has already started, the old one just quietly stops itself instead of
     fighting with the new one over the same text. */
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

  /* Every [data-typewriter] or [data-reveal] element inside the body, in
     DOM order - the full sequence runPageTypeIn()/runPageEraseOut() walk.
     querySelectorAll rather than direct-children-only deliberately: Home's
     opening paragraph sits nested inside a wrapper div (alongside its
     accompanying image, see .welcome-lead), not as a direct child of the
     body, and still needs to be found. This stays safe for [data-reveal]
     blocks that themselves contain ordinary markup - the Summary page's
     reference section wraps a heading and several citation entries, none
     of which carry either attribute themselves, so they're simply never
     matched and the whole section is walked as the one block it's meant
     to be. */
  function getSequenceItems(page) {
    var body = page.querySelector('.term-window__body');
    if (!body) { return []; }
    return Array.prototype.slice.call(body.querySelectorAll('[data-typewriter], [data-reveal]'));
  }

  function isTypedPage(page) {
    return getSequenceItems(page).some(function (el) { return el.hasAttribute('data-typewriter'); });
  }

  /* Types `el`'s full text in from empty.

     No sound is played here (unlike the intro's typewriter and the
     console's input): at this speed, over a whole paragraph, the clicks
     overlapped into a noisy blur rather than reading as discrete
     keystrokes - the visual type-in is kept, the audio just isn't worth
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
     fully typed paragraph or something the user interrupted mid-type -
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
     Fire-and-forget from showPage(): resets every sequenced block, waits
     for the term-window's own fade-in to finish, then walks the sequence
     in order - typing [data-typewriter] blocks character-by-character,
     fading [data-reveal] blocks in as a whole once their turn comes.
     Reduced motion skips straight to the finished state. */
  async function runPageTypeIn(page) {
    var items = getSequenceItems(page);
    if (!items.length) { return; }

    var token = beginSequence();
    items.forEach(function (el) {
      if (el.hasAttribute('data-typewriter')) { el.textContent = ''; }
      else { el.classList.remove('is-typed-in'); }
    });

    if (prefersReducedMotion()) {
      items.forEach(function (el) {
        if (el.hasAttribute('data-typewriter')) { el.textContent = TYPEWRITER_TEXT.get(el) || ''; }
        else { el.classList.add('is-typed-in'); }
      });
      return;
    }

    var termWindow = page.querySelector('.term-window');
    if (termWindow) { termWindow.classList.add('is-typing'); }

    try {
      await typeSleep(WINDOW_REVEAL_MS);
      typeCheckpoint(token);

      for (var i = 0; i < items.length; i++) {
        var el = items[i];
        if (el.hasAttribute('data-typewriter')) {
          await typeElementText(el, TYPE_SPEED, token);
        } else {
          el.classList.add('is-typed-in');
        }
        typeCheckpoint(token);
        await typeSleep(140);
        typeCheckpoint(token);
      }
    } catch (e) {
      if (e !== TYPE_ABORT) { throw e; }
    } finally {
      if (termWindow) { termWindow.classList.remove('is-typing'); }
    }
  }

  /* Instantly completes whatever's currently typing - the "click to skip"
     affordance (see the document click listener further down), and also
     called defensively at the start of leaving a typed page (see
     showConsole()) to guarantee any in-flight type-in is fully stopped
     before the erase sequence begins. beginSequence() is what actually
     invalidates it; the DOM fill here just makes that visible immediately
     instead of waiting for the (now-doomed) sequence's own cleanup. */
  function skipPageTypeIn(page) {
    beginSequence();
    if (typeState.wake) { typeState.wake(); }

    getSequenceItems(page).forEach(function (el) {
      if (el.hasAttribute('data-typewriter')) { el.textContent = TYPEWRITER_TEXT.get(el) || ''; }
      else { el.classList.add('is-typed-in'); }
    });

    var termWindow = page.querySelector('.term-window');
    if (termWindow) { termWindow.classList.remove('is-typing'); }
  }

  /* --- Erase-out (the page's "outro") -------------------------------------
     Called from showConsole()'s outro handling. Walks the sequence in
     REVERSE - last block first, up to the heading - so it reads as
     "closing from the bottom", the mirror image of typing in. */
  async function runPageEraseOut(page) {
    var items = getSequenceItems(page);
    if (!items.length) { return; }

    var token = beginSequence();

    if (prefersReducedMotion()) {
      items.forEach(function (el) {
        if (el.hasAttribute('data-typewriter')) { el.textContent = ''; }
        else { el.classList.remove('is-typed-in'); }
      });
      return;
    }

    try {
      for (var i = items.length - 1; i >= 0; i--) {
        var el = items[i];
        if (el.hasAttribute('data-typewriter')) {
          await eraseElementText(el, ERASE_SPEED, ERASE_CHUNK, token);
        } else {
          el.classList.remove('is-typed-in');
          await typeSleep(160);
        }
        typeCheckpoint(token);
      }
    } catch (e) {
      if (e !== TYPE_ABORT) { throw e; }
    }
  }

  /* Instantly finishes erasing - the "skip" side of leaving a page, fired
     by a second Esc/back while the outro is already running. */
  function skipPageEraseOut(page) {
    beginSequence();
    if (typeState.wake) { typeState.wake(); }

    getSequenceItems(page).forEach(function (el) {
      if (el.hasAttribute('data-typewriter')) { el.textContent = ''; }
      else { el.classList.remove('is-typed-in'); }
    });
  }


  /* --------------------------------------------------------------------------
     01d. SCROLL-DRIVEN HERO IMAGE
     Pages carrying a [data-hero] block open with their image at full size,
     then shrink it into a small thumbnail pinned to the top of the screen
     as the user scrolls, revealing the written content underneath.

     The whole effect is one number: `p`, the scroll progress from 0 (image
     full size, content hidden) to 1 (image pinned small, content readable).
     Everything else - the image's transform, the backdrop bar's opacity,
     the content's fade - is derived from `p`, which keeps the forward and
     reverse directions automatically symmetrical: scrolling back up runs
     the identical maths in reverse, no separate "undo" path to keep in
     sync.

     Only `transform` and `opacity` are ever written (see the CSS in
     styles.css section 07c for why), so no frame of this triggers layout.
  -------------------------------------------------------------------------- */

  /* Pinned thumbnail size caps. Both are needed because the images differ
     in orientation: the landscape aspect-page images hit the width cap
     first, the portrait infographic hits the height cap first, and using
     only one of the two would leave the other orientation either a wide
     band or a thin sliver. */
  var PIN_MAX_H = 108;
  var PIN_MAX_W = 190;
  /* Clears the persistent pinned command bar (.console-bar--pinned in
     styles.css), which now occupies roughly the same top band on every
     content page - matches .term-window__bar's sticky `top` for the same
     reason. The bar itself measures ~72px tall (12px top offset + ~60px
     height); 82 leaves a clean ~10px gap rather than the two edges
     touching or overlapping. */
  var PIN_TOP   = 82;

  var heroes = [];

  Array.prototype.slice.call(document.querySelectorAll('[data-hero]')).forEach(function (heroEl) {
    var section = heroEl.closest('.screen--page');
    if (!section) { return; }
    heroes.push({
      section: section,
      el:      heroEl,
      frame:   heroEl.querySelector('[data-hero-frame]'),
      img:     heroEl.querySelector('[data-hero-img]'),
      bar:     heroEl.querySelector('.hero__bar'),
      prompt:  heroEl.querySelector('[data-hero-prompt]'),
      spacer:  section.querySelector('[data-hero-spacer]'),
      inner:   section.querySelector('.page__inner'),
      typed:   false,   /* has this visit already triggered the typewriter? */
      progress: 0
    });
  });

  function heroFor(page) {
    for (var i = 0; i < heroes.length; i++) {
      if (heroes[i].section === page) { return heroes[i]; }
    }
    return null;
  }

  function clamp01(n) { return n < 0 ? 0 : (n > 1 ? 1 : n); }

  /* Smoothstep - eases both ends so the image doesn't jerk into motion the
     instant the wheel moves, nor slam to a stop when it lands pinned. */
  function smoothstep(t) { return t * t * (3 - 2 * t); }

  function applyHero(hero, p) {
    var img = hero.img;
    /* offsetWidth/Height are the *untransformed* layout size - exactly what
       we need, since the transform below is expressed relative to it. */
    var w = img.offsetWidth;
    var h = img.offsetHeight;
    if (!w || !h) { return; }   /* image not laid out yet (e.g. still loading) */

    hero.progress = p;
    var e = smoothstep(p);

    /* Shrink to whichever cap binds first, so tall portrait images and wide
       landscape ones both end up a sensible thumbnail. */
    var pinScale = Math.min(PIN_MAX_H / h, PIN_MAX_W / w);
    var scale = 1 + (pinScale - 1) * e;

    /* The image sits dead-centre of the viewport at rest (its .hero parent
       is a fixed, flex-centred, inset:0 box), so the travel is simply the
       gap between the viewport's centre line and the pinned centre line. */
    var pinnedCentreY = PIN_TOP + (h * pinScale) / 2;
    var dy = (pinnedCentreY - window.innerHeight / 2) * e;

    hero.frame.style.transform =
      'translate3d(0, ' + dy.toFixed(2) + 'px, 0) scale(' + scale.toFixed(4) + ')';

    if (hero.bar) { hero.bar.style.opacity = e.toFixed(3); }
    /* Prompt clears early - it's stale advice the moment scrolling starts. */
    if (hero.prompt) { hero.prompt.style.opacity = (1 - clamp01(p * 2.6)).toFixed(3); }

    /* Content trails the image: it only starts fading up once the image is
       meaningfully out of the way, and finishes before the image is fully
       pinned, so the two never look like they're fighting for attention. */
    var cp = clamp01((p - 0.22) / 0.45);
    hero.inner.style.opacity = cp.toFixed(3);
    hero.inner.style.transform = 'translate3d(0, ' + ((1 - cp) * 18).toFixed(2) + 'px, 0)';
    /* Invisible content shouldn't be clickable. */
    hero.inner.style.pointerEvents = cp < 0.1 ? 'none' : 'auto';

    /* Start typing once the text is actually on its way in - not on page
       open, which would have it finish unseen behind the full-size image. */
    if (!hero.typed && p > 0.4) {
      hero.typed = true;
      runPageTypeIn(hero.section);
    }
  }

  function heroScrollRange(hero) {
    /* Slightly less than the spacer's full height, so the image finishes
       pinning a touch before the spacer has scrolled entirely past. */
    return Math.max(1, hero.spacer.offsetHeight * 0.78);
  }

  function syncHero(hero) {
    applyHero(hero, clamp01(hero.section.scrollTop / heroScrollRange(hero)));
  }

  /* Reduced motion: no scroll choreography at all - open straight into the
     pinned/readable end state, matching how the intro and the canvases
     handle the same preference. */
  function heroIsStatic() { return prefersReducedMotion(); }

  /* Restarts a CSS glitch animation on `el` - removes the class, forces a
     reflow so the browser notices it's gone, re-adds it, then clears it
     again after `duration` (a plain timeout rather than 'animationend':
     simpler, and immune to an animationend that never fires if the class
     gets removed from under it elsewhere). Used for both the hero image's
     one-shot entrance glitch and the lightbox's open/close glitch. */
  function playGlitch(el, cls, duration) {
    if (!el) { return; }
    clearTimeout(el._glitchTimer);
    el.classList.remove(cls);
    void el.offsetWidth;   /* forces the removal to take effect before re-adding */
    el.classList.add(cls);
    el._glitchTimer = setTimeout(function () { el.classList.remove(cls); }, duration);
  }

  /* The chromatic-aberration ghost copies (see styles.css .hero__frame::
     before/::after) render whatever --glitch-src currently points at, so
     it has to be (re)pointed at this hero's own image before each glitch -
     otherwise a page opened before its image's first load, or opened a
     second time, could flash a stale or blank ghost. */
  function playHeroGlitch(hero) {
    if (!hero.frame || !hero.img) { return; }
    hero.frame.style.setProperty('--glitch-src', 'url("' + (hero.img.currentSrc || hero.img.src) + '")');
    playGlitch(hero.frame, 'is-glitching', 640);
  }

  /* --- Lightbox --------------------------------------------------------
     Clicking the hero image - pinned or full-size, doesn't matter - opens
     it full-screen and scrollable. This exists because the shrink effect
     alone isn't enough for a tall infographic: even at "full size" the
     hero is capped to 74vh (see .hero__img), which for a portrait image
     forces the width down with it and leaves the text inside genuinely too
     small to read. The lightbox shows the same image unconstrained by
     viewport height, so reading it is a scroll instead of a squint. */
  var lightbox       = document.getElementById('hero-lightbox');
  var lightboxImg    = lightbox && lightbox.querySelector('[data-lightbox-img]');
  var lightboxWrap   = lightbox && lightbox.querySelector('[data-lightbox-imgwrap]');
  var lightboxScroll = lightbox && lightbox.querySelector('[data-lightbox-scroll]');
  var lightboxClose  = lightbox && lightbox.querySelector('[data-lightbox-close]');
  var lightboxOpener = null;   /* the hero.frame that opened it, for focus return on close */

  function isLightboxOpen() {
    return !!lightbox && lightbox.classList.contains('is-open');
  }

  function openLightbox(hero) {
    if (!lightbox || !lightboxImg) { return; }
    clearTimeout(lightboxCloseTimer);
    if (lightboxWrap) { lightboxWrap.classList.remove('is-glitching-out'); }
    var src = hero.img.currentSrc || hero.img.src;
    lightboxImg.src = src;
    lightboxImg.alt = hero.img.alt;
    if (lightboxScroll) { lightboxScroll.scrollTop = 0; }
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    lightboxOpener = hero.frame;
    if (!heroIsStatic() && lightboxWrap) {
      lightboxWrap.style.setProperty('--glitch-src', 'url("' + src + '")');
      playGlitch(lightboxWrap, 'is-glitching-in', 460);
    }
  }

  /* Set by closeLightbox() while the glitch-out plays, so a second close
     (or opening a fresh image mid-close) can cancel the pending hide. */
  var lightboxCloseTimer = null;

  function closeLightbox() {
    if (!lightbox) { return; }

    function finish() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      if (lightboxWrap) { lightboxWrap.classList.remove('is-glitching-out'); }
      /* Return focus to whatever opened it, for keyboard/screen-reader users
         - otherwise focus is left on a now-hidden close button. */
      if (lightboxOpener) { lightboxOpener.focus({ preventScroll: true }); }
      lightboxOpener = null;
    }

    if (heroIsStatic() || !lightboxWrap) { finish(); return; }

    clearTimeout(lightboxCloseTimer);
    lightboxWrap.classList.remove('is-glitching-in');
    void lightboxWrap.offsetWidth;
    lightboxWrap.classList.add('is-glitching-out');
    lightboxCloseTimer = setTimeout(finish, 280);
  }

  if (lightboxClose) { lightboxClose.addEventListener('click', closeLightbox); }

  /* Clicking the backdrop (anywhere in the scroll area that isn't the
     image itself) closes it too - the image is the only other direct
     child, so target === lightboxScroll reliably means "missed it". */
  if (lightboxScroll) {
    lightboxScroll.addEventListener('click', function (event) {
      if (event.target === lightboxScroll) { closeLightbox(); }
    });
  }

  heroes.forEach(function (hero) {
    hero.section.addEventListener('scroll', function () {
      if (heroIsStatic()) { return; }
      syncHero(hero);
    }, { passive: true });

    if (hero.frame) {
      hero.frame.addEventListener('click', function () { openLightbox(hero); });
    }
  });

  /* The pinned geometry is derived from the image's laid-out size and the
     viewport height, so both a resize and a late-arriving image need a
     recompute. */
  window.addEventListener('resize', function () {
    heroes.forEach(function (hero) {
      if (heroIsStatic()) { applyHero(hero, 1); } else { syncHero(hero); }
    });
  });

  heroes.forEach(function (hero) {
    if (hero.img && !hero.img.complete) {
      hero.img.addEventListener('load', function () {
        if (heroIsStatic()) { applyHero(hero, 1); } else { syncHero(hero); }
      });
    }
  });

  /* Called by showPage() - puts a hero page back into its opening state. */
  function resetHero(hero) {
    hero.typed = false;

    if (heroIsStatic()) {
      hero.el.classList.add('is-static');
      applyHero(hero, 1);
      hero.typed = true;
      runPageTypeIn(hero.section);
      return;
    }

    hero.el.classList.remove('is-static');
    playHeroGlitch(hero);

    /* Force the scroll container back to the top. showPage() already does
       this, but it doesn't reliably stick: the browser restores a scroll
       container's previous offset itself, and for a container that was
       visibility:hidden until a moment ago that restore can land *after*
       showPage has run - which opened the page already scrolled, so the
       hero appeared pre-shrunk instead of full size. Re-asserting here,
       and again on the next frame, wins against that late restore.
       (history.scrollRestoration is also set to 'manual' at the bottom of
       this module, which stops it happening on a reload in the first
       place; this covers the in-session navigations.) */
    hero.section.scrollTop = 0;
    applyHero(hero, 0);

    requestAnimationFrame(function () {
      if (hero.section.scrollTop !== 0) { hero.section.scrollTop = 0; }
      applyHero(hero, clamp01(hero.section.scrollTop / heroScrollRange(hero)));
    });
  }

  /* This site is a single document whose "pages" are shown by toggling
     classes, so there is never a meaningful scroll offset worth restoring -
     and letting the browser restore one actively breaks the hero's opening
     state (see resetHero above). */
  if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }


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

    /* Retire whichever page is currently open before opening the new one.
       This used to be impossible - every page was entered from the console,
       so there was never another page to close - but the Home page links
       straight to the three log pages, which makes page-to-page navigation
       reachable for the first time. Without this both pages end up carrying
       .is-active and render stacked on top of each other.

       skipPageTypeIn() is what actually matters here beyond the classes: it
       bumps the typewriter's generation token, so the outgoing page's
       in-flight typing can't keep writing into the DOM alongside the
       incoming page's. */
    if (activePage && activePage !== page) {
      skipPageTypeIn(activePage);
      activePage.classList.remove('is-active', 'is-leaving', 'is-revealed');
    }

    /* Likewise if a close animation is mid-flight: finish it off rather
       than leaving that page half-dismissed behind the new one. */
    if (isLeaving && pageBeingClosed && pageBeingClosed !== page) {
      clearTimeout(cssOutroTimer);
      cssOutroTimer = null;
      pageBeingClosed.classList.remove('is-active', 'is-leaving', 'is-revealed');
      pageBeingClosed = null;
      isLeaving = false;
    }

    page.classList.add('is-active');
    activePage = page;

    /* Pin the command bar to the top for this page - see relocateBar()
       and the HTML comment above #console-bar. Safe to call even when
       already pinned (moving between two content pages): relocateBar()
       no-ops the DOM move when the bar's already in the target slot. */
    relocateBar(true);

    /* Reset the reveal, force a reflow so the browser "notices" the class
       is gone, then re-add it. Without the reflow the remove+add would be
       batched into a single style recalc and the transition would not
       replay on a second visit to the same page. */
    page.classList.remove('is-revealed');
    void page.offsetWidth; /* eslint-disable-line no-unused-expressions */
    page.classList.add('is-revealed');

    page.scrollTop = 0;
    clearFeedback();

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

    /* The page's text "intro" - fire-and-forget; runPageTypeIn() is a no-op
       on the references page (isTypedPage() is false there), which keeps
       its existing CSS fade-stagger untouched.

       Hero pages are the exception: their text is still hidden behind a
       full-size image at this point, so typing now would run the whole
       animation unseen. resetHero() puts the hero back to its opening
       state and hands the typewriter off to the scroll handler, which
       fires it once the text is actually coming into view. */
    var hero = heroFor(page);
    if (hero) { resetHero(hero); }
    else { runPageTypeIn(page); }
  }

  var OUTRO_MS = 260;      /* CSS-only outro duration (the references page) */
  var isLeaving = false;   /* an outro - either kind - is currently running */
  var pageBeingClosed = null;
  var cssOutroTimer = null;

  /* Leaving a page has two different outros, chosen by isTypedPage():
       - typed pages (data breach / iam / malware) erase their text back
         out (runPageEraseOut, variable duration)
       - the references page keeps the original CSS-only fade (OUTRO_MS)
     A second Esc/back/logo-click while either is already running skips
     straight through instead of queuing a second one - see skipOutro(). */
  function showConsole() {
    if (isLeaving) { skipOutro(); return; }
    if (!activePage) { finishShowConsole(); return; }

    pageBeingClosed = activePage;
    activePage = null;
    isLeaving = true;

    if (isTypedPage(pageBeingClosed)) {
      /* Deliberately NOT adding .is-leaving here. That class fades the
         whole term-window box to invisible in ~240ms (see styles.css) -
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
         below - both fighting over the same shared typeState.wake and the
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
         called here directly - that would run it twice. */
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

    /* Move the command bar back into its normal centred spot in the
       console layout - the mirror image of showPage()'s relocateBar(true). */
    relocateBar(false);

    el.input.value = '';
    updateGhost();
    updateCaretPosition();
    clearFeedback();
    /* Return focus to the command line so the user can type again straight
       away, without forcing a click first. */
    el.input.focus();

    if (window.D7Backgrounds) { window.D7Backgrounds.stopAll(); }
  }


  /* --------------------------------------------------------------------------
     03. COMMAND HANDLING
  -------------------------------------------------------------------------- */

  function clearFeedback() {
    el.feedback.textContent = '';
    el.feedback.classList.remove('is-visible', 'is-info');
  }

  /* Unrecognised-command warning - amber, via the default .console__feedback
     colour (see styles.css). */
  function showFeedback(message) {
    el.feedback.textContent = message;
    el.feedback.classList.remove('is-info');
    el.feedback.classList.add('is-visible');
  }

  /* "help" response - same line, but cyan/informational rather than a
     warning (.is-info overrides the default amber). */
  /* The response is built as HTML (not textContent) so each command is a
     real clickable [data-cmd] word, same as the hint line and every page's
     "back" prompt - the existing document-level click listener further
     down already handles these for free, nothing extra to wire up. Safe to
     use innerHTML here since every character comes from this fixed string,
     never from the user's own input. */
  function showHelp() {
    el.feedback.innerHTML =
      'here’s what you can open: ' +
      '<span data-cmd="home">home</span> · ' +
      '<span data-cmd="data breach">data breach</span> · ' +
      '<span data-cmd="iam">iam</span> · ' +
      '<span data-cmd="malware">malware</span> · ' +
      '<span data-cmd="about">about</span> · ' +
      '<span data-cmd="settings">settings</span> ' +
      '- click a word or type it, either works';
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
         "back" fired mid-outro - clicking the logo or the prompt's "back"
         word again - would silently do nothing instead of reaching
         showConsole()'s own skip-the-outro handling. */
      if (activePage || isLeaving) { showConsole(); }
      return;
    }

    if (result === 'HELP') {
      /* #console-feedback travels with #console-bar (see relocateBar()),
         so this shows in the right place automatically - no navigation
         needed even when triggered from a content page. */
      showHelp();
      return;
    }

    if (result) {
      showPage(result);
      return;
    }

    /* Unrecognised input - the feedback line is now reachable from any
       page (it travels with the bar, see relocateBar()), so this shows
       regardless of whether a page is open. */
    showFeedback('command not recognised - try: data breach / iam / malware / about / settings');
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
     (not every alias - completing to a word the user can actually see
     listed is what makes this discoverable rather than a guessing game).
     Multiple matches complete to their longest common prefix instead of
     doing nothing; with this small a command set that's rare in practice
     (every command happens to start with a different letter), but it's a
     reasonable fallback if the list ever grows.

     el.ghost (see the HTML/CSS) previews what Tab would do, before you
     press it - only shown when there's exactly one match, since a
     longest-common-prefix result isn't really "the" suggestion. */
  var TAB_COMPLETIONS = ['home', 'data breach', 'iam', 'malware', 'about', 'settings', 'back', 'help'];

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
    /* Full completion string, not just the remainder - the CSS overlap
       trick (see .console__ghost) relies on the ghost's leading
       characters matching what's already typed, so the input's own
       opaque text can sit on top of them and hide them. */
    el.ghost.textContent = (matches.length === 1 && matches[0] !== value) ? matches[0] : '';
  }

  /* --------------------------------------------------------------------------
     01c. CARET TRACKING
     #console-caret is a styled element (glowing box, blink animation - see
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
     pauses - same idea as the intro's own caret, just driven by a short
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
       session on window resize - keep the mirror in step with it. */
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

  /* Cursor can also move without the value changing - arrow keys, Home/
     End, or clicking partway through the text - none of which fire
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
    /* setting .value directly doesn't fire 'input' either - same reason
       these need their own calls too. */
    updateGhost();
    updateCaretPosition();
  });

  /* Clicking a highlighted word (in the hint line or a page's return prompt)
     runs that command directly - a mouse-friendly shortcut alongside typing. */
  document.addEventListener('click', function (event) {
    var target = event.target.closest ? event.target.closest('[data-cmd]') : null;
    if (!target) { return; }
    runCommand(target.getAttribute('data-cmd'));
    el.input.focus();
  });

  /* Anywhere-click skips straight to the finished text while a page's
     content is still typing in - the ".is-typing" hint (see styles.css)
     is what tells the user this works. Guarded to only fire while typing
     is actually in progress, so it never interferes with a normal click
     on "back" or the video card once the text has settled.

     Also skips entirely for clicks on a [data-cmd] word. Without that
     exclusion, clicking a command (rather than typing it) would trigger
     THIS listener too, on the exact same click: the [data-cmd] handler
     above runs first, calls showPage(), which calls runPageTypeIn() -
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
     while the outro is already running skips straight through it -
     showConsole() itself handles that branch (isLeaving check). Checking
     isLeaving here too matters because activePage is nulled the instant
     an outro starts, so activePage alone would miss that second press.

     The lightbox gets first refusal on Esc: it's a modal layered on top of
     everything else, so Esc should close *it* first, not also start
     leaving the page underneath in the same keypress. */
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') { return; }
    if (isLightboxOpen()) { closeLightbox(); return; }
    if (activePage || isLeaving) { showConsole(); }
  });

})();


/* ============================================================================
   STAGE 3: PAGE BACKGROUND ANIMATIONS

   Each content page has its own <canvas> in the background (see .page__bg
   in the HTML) with its own little animation drawn onto it with plain
   JavaScript - no library for this. The router in Stage 2 starts the right
   one when you open a page and stops it again when you leave, using the
   window.D7Backgrounds.start/stop/stopAll functions at the bottom of this
   section, so only the page you're actually looking at is animating (no
   point wasting the browser's effort animating something off-screen).

   If animations are switched off, each page just draws one still frame
   instead of looping.

   What's in this section:
     00. Engine (keeps track of every canvas, resize, start/stop)
     01. Data breach  - falling fragments
     02. IAM          - pulsing access-point grid
     03. Malware      - spreading infection graph
     04. Wiring it all up
   ========================================================================== */

(function () {
  'use strict';

  function prefersReducedMotion() {
    /* Manual toggle only (see Stage 0b) - deliberately doesn't also check
       the OS-level prefers-reduced-motion media query, since several of
       this site's animations are the design, not just flourish; the
       choice is offered explicitly via the button instead of inferred. */
    return !!(window.D7Motion && window.D7Motion.reduced);
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
      /* One static frame, no loop - texture without motion. */
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
     01. DATA BREACH - falling fragments
     Small broken-bracket glyphs drifting downward at slightly different
     speeds, like debris (or leaking data) falling out of the page.
     Positions are stored as 0-1 fractions of width/height so a window
     resize never requires regenerating the particle set.
  -------------------------------------------------------------------------- */

  function createFragments() {
    var particles = [];
    var count = 56;
    for (var i = 0; i < count; i++) {
      /* Bigger fragments are treated as "closer" - slower, more opaque, a
         touch of glow - which gives the field some depth instead of every
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

      /* Two opposite bracket-corners - reads as a "broken" fragment rather
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
     02. IAM - pulsing access-point grid
     A grid of small squares whose brightness is a travelling sine wave -
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
       reached - reads as "the grid is always there, the scan is what lights
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
     03. MALWARE - spreading infection graph
     A small fixed network: nodes connected to their two nearest neighbours.
     A single "patient zero" infects outward through the graph (breadth-
     first, so it spreads through connections rather than randomly), holds
     at full infection, fades back to clean, pauses, then loops.

     Node layout and the patient-zero index are hand-fixed (not randomised)
     so the animation is identical on every load - a predictable, reviewed
     result rather than a different graph each visit.
  -------------------------------------------------------------------------- */

  /* Normalised (0-1) positions - patient zero (index 0) sits centrally so
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
       edge isn't drawn twice. Deterministic - same inputs, same graph. */
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

   This was meant to auto-play/pause the embedded YouTube video as you
   scroll it into and out of view, using YouTube's postMessage API (no
   YouTube script needed for that, just messaging the iframe directly).

   IMPORTANT: I ended up NOT using a real embed on the Data Breach page -
   the video I wanted to use has embedding turned off by whoever uploaded
   it, so there's just a "watch on YouTube" link/thumbnail card there
   instead (see the HTML). Because of that, this whole section never
   actually finds the iframe it's looking for and does nothing. I left the
   code in in case I swap in a different, embeddable video later.
   ========================================================================== */

(function () {
  'use strict';

  function prefersReducedMotion() {
    /* Manual toggle only (see Stage 0b) - deliberately doesn't also check
       the OS-level prefers-reduced-motion media query, since several of
       this site's animations are the design, not just flourish; the
       choice is offered explicitly via the button instead of inferred. */
    return !!(window.D7Motion && window.D7Motion.reduced);
  }

  var wrap = document.querySelector('[data-yt-video]');
  if (!wrap) { return; }

  var iframe = wrap.querySelector('[data-yt-iframe]');
  if (!iframe) { return; }   /* fallback link markup, not a real embed - see NOTE above */

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
