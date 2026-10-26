/* Every light is green — interactions. Plain JavaScript, no build step. */
(function () {
  "use strict";

  /* ---------- helpers ---------- */

  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) for (var k in props) {
      var v = props[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c === undefined || c === null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  var NS = "http://www.w3.org/2000/svg";
  function s(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs || {}) { if (attrs[k] === undefined || attrs[k] === null) continue; if (k === "text") el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]); }
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(r) { var u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function slider(o) {
    var id = "r" + Math.random().toString(36).slice(2, 8);
    var input = h("input", { type: "range", id: id, min: o.min, max: o.max, step: o.step || 1, value: o.value });
    var out = h("output", { for: id }, o.fmt ? o.fmt(o.value) : String(o.value));
    function fill() { input.style.setProperty("--fill", ((input.value - o.min) / (o.max - o.min)) * 100 + "%"); }
    fill();
    input.addEventListener("input", function () { var v = +input.value; out.textContent = o.fmt ? o.fmt(v) : String(v); if (o.text) input.setAttribute("aria-valuetext", o.text(v)); fill(); o.onInput(v); });
    if (o.text) input.setAttribute("aria-valuetext", o.text(+o.value));
    return { el: h("div", { class: "slider" }, h("div", { class: "slider__row" }, h("label", { for: id }, o.label), out), input), input: input,
      set: function (v) { input.value = v; input.dispatchEvent(new Event("input")); } };
  }
  function toggle(label, onChange, checked) {
    var input = h("input", { type: "checkbox" });
    input.checked = !!checked;
    input.addEventListener("change", function () { onChange(input.checked); });
    return h("label", { class: "toggle" }, input, h("span", { class: "toggle__track", "aria-hidden": "true" }), h("span", null, label));
  }
  function pct(x) { return Math.round(x * 100) + "%"; }

  /* ---------- reading progress ---------- */

  var bar = document.getElementById("progress");
  function prog() {
    var d = document.documentElement, max = d.scrollHeight - d.clientHeight;
    bar.style.width = (max > 0 ? (d.scrollTop / max) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", prog, { passive: true }); prog();

  /* =========================================================
     The dashboard
     ========================================================= */

  var LIGHTS = [
    ["Passed every safety test", "All 240 checks passed"],
    ["Better than the last version", "Higher score on every benchmark"],
    ["Approved by the safety team", "Signed off before release"],
    ["No problems detected", "Alarms quiet all year"]
  ];
  function dashModel(v) {
    var t = (v - 1) / 9;
    var r = 0.9 * t, lr = 1 / (r + (1 - r) * 0.1);
    var look = [100, 100, 80, 80, 60, 40, 40, 15, 6, 6][v - 1];
    var off = v <= 3 ? "Easy" : v <= 5 ? "A big project" : v <= 8 ? "A political fight" : "Nearly unthinkable";
    return [
      { l: "How much of what the AI can do the tests actually check", v: pct(0.95 - 0.62 * Math.pow(t, 0.9)), f: 0.95 - 0.62 * Math.pow(t, 0.9), c: 2 },
      { l: "How often the released version double-checks risky actions", v: pct(1 - 0.55 * t), f: 1 - 0.55 * t, c: 3 },
      { l: "How much a passed test really tells you", v: lr >= 5 ? "A lot" : lr >= 2 ? "Some" : lr >= 1.25 ? "Not much" : "Almost nothing", f: Math.log10(lr), c: 4 },
      { l: "Changes a person looks at before they take effect", v: look + "%", f: look / 100, c: 5 },
      { l: "How much of the evidence the AI itself produced", v: pct(0.15 + 0.7 * t), f: 1 - (0.15 + 0.7 * t), c: 7, invert: true, raw: 0.15 + 0.7 * t },
      { l: "Switching it off would be", v: off, f: 1 - t * 0.92, c: 8 }
    ];
  }
  var ver = 1, flipped = false;
  var front = document.getElementById("dash-front"), back = document.getElementById("dash-back"), flip = document.getElementById("flip");
  var lamps = LIGHTS.map(function (l) {
    var lamp = h("span", { class: "lamp", "aria-hidden": "true" });
    return { lamp: lamp, el: h("div", { class: "light" }, lamp, h("div", { class: "light__text" }, l[0], h("small", null, l[1]))) };
  });
  var verEl = h("p", { class: "dash__ver" });
  front.appendChild(h("div", { class: "dash__top" }, h("p", { class: "dash__title" }, "AI safety report"), verEl));
  front.appendChild(h("div", { class: "lights" }, lamps.map(function (x) { return x.el; })));
  front.appendChild(h("div", { class: "dash__foot" }, h("p", { class: "dash__note" }, "Every statement on this panel is true.")));
  var backVer = h("span", { class: "muted small" });
  var meters = h("div", { class: "meters" });
  back.appendChild(h("div", { class: "behind__top" }, h("p", { class: "behind__title" }, "What the green lights don't show"), backVer));
  back.appendChild(meters);
  back.appendChild(h("p", { class: "small muted", style: { margin: "1rem 0 0" } }, "Made-up numbers, to show the shape of each problem. Every one is explained further down the page."));

  function drawDash() {
    verEl.textContent = "Version " + ver;
    backVer.textContent = "Version " + ver;
    clear(meters);
    dashModel(ver).forEach(function (m) {
      var good = m.f;
      var col = good > 0.66 ? "var(--green-mark)" : good > 0.4 ? "var(--amber-mark)" : "var(--red-mark)";
      var cls = good > 0.66 ? "is-green" : good > 0.4 ? "" : "is-red";
      meters.appendChild(h("div", { class: "meter" },
        h("div", { class: "meter__row" }, h("span", null, m.l), h("span", { class: "meter__val " + cls }, m.v)),
        h("div", { class: "meter__bar" }, h("div", { class: "meter__fill", style: { width: Math.max(4, (m.invert ? m.raw : m.f) * 100) + "%", background: col } })),
        h("div", { class: "meter__why" }, h("a", { href: "#c" + m.c }, "Explained in part " + m.c))));
    });
  }
  var inner = flip.querySelector(".flip__inner");
  function syncFlip() { inner.style.height = (flipped ? back : front).offsetHeight + "px"; }
  window.addEventListener("resize", syncFlip);
  function setFaces() {
    flip.classList.toggle("is-flipped", flipped);
    front.setAttribute("aria-hidden", String(flipped));
    back.setAttribute("aria-hidden", String(!flipped));
    if ("inert" in front) { front.inert = flipped; back.inert = !flipped; }
    flipBtn.textContent = flipped ? "Show the dashboard again" : "Look behind the dashboard";
    document.getElementById("dash-hint").textContent = flipped
      ? "The front still says the same thing. Change the version and flip back to check."
      : ver === 1 ? "Move to a newer version. Then look behind the dashboard." : "Version " + ver + ". Still all green. Now look behind it.";
    syncFlip();
  }
  var verSlider = slider({ label: "Which version of the AI", min: 1, max: 10, value: 1, fmt: function (v) { return "Version " + v; }, text: function (v) { return "Version " + v + " of 10"; },
    onInput: function (v) {
      ver = v; drawDash(); setFaces();
      if (!reduce) lamps.forEach(function (x) { x.lamp.classList.remove("blink"); void x.lamp.offsetWidth; x.lamp.classList.add("blink"); });
    } });
  var flipBtn = h("button", { type: "button", class: "btn" }, "Look behind the dashboard");
  flipBtn.addEventListener("click", function () { flipped = !flipped; setFaces(); });
  var dc = document.getElementById("dash-controls");
  dc.appendChild(verSlider.el); dc.appendChild(flipBtn);
  drawDash(); setFaces();

  /* =========================================================
     1. AI helps build AI
     ========================================================= */

  var JOBS = [
    ["Writing the computer code for the next version", "Fast, and usually good. People review some of it.", 2],
    ["Making practice material the next version learns from", "Examples, exercises and answers, produced in bulk.", 3],
    ["Grading the next version's answers while it learns", "Cheaper and faster than paying people to grade.", 4],
    ["Helping design the safety tests", "It knows what it can do better than anyone.", 5],
    ["Writing the summaries the safety team reads", "Nobody can read everything; summaries are a lifesaver.", 6]
  ];
  var build = document.getElementById("build");
  var chain = h("div", { class: "chain", "aria-hidden": "true" });
  var chainEls = [1, 2, 3, 4, 5, 6].map(function (v) { var e = h("div", { class: "chain__v" }, "V" + v); chain.appendChild(e); return e; });
  var jobsEl = h("ul", { class: "jobs" });
  var jobEls = JOBS.map(function (j) {
    var icon = h("span", { class: "job__icon", "aria-hidden": "true" });
    var li = h("li", { class: "job" }, icon, h("div", null, h("b", null, j[0]), h("span", null, j[1])));
    li._icon = icon; jobsEl.appendChild(li); return li;
  });
  var buildNote = h("p", { class: "small", style: { marginTop: "1rem" }, "aria-live": "polite" });
  build.appendChild(h("h4", null, "Who helps build each new version?"));
  build.appendChild(slider({ label: "Version being built", min: 1, max: 6, value: 1, fmt: function (v) { return "Version " + v; }, onInput: drawBuild }).el);
  build.appendChild(chain); build.appendChild(jobsEl); build.appendChild(buildNote);
  function drawBuild(v) {
    v = v || 1;
    chainEls.forEach(function (e, i) { e.classList.toggle("is-on", i < v); e.classList.toggle("is-now", i === v - 1); });
    var n = 0;
    jobEls.forEach(function (li, i) {
      var ai = v >= JOBS[i][2];
      if (ai) n++;
      li.classList.toggle("is-ai", ai);
      li._icon.textContent = ai ? "AI" : "P";
      li.setAttribute("aria-label", JOBS[i][0] + (ai ? ": done with help from the previous AI" : ": done by people"));
    });
    buildNote.textContent = v === 1
      ? "Version 1 is built and checked by people. Labels: P means people do it, AI means the previous version helps."
      : v < 6 ? "Building version " + v + ", the previous AI now helps with " + n + " of 5 jobs. People still oversee all of it. Each step saves real time."
        : "By version 6, the previous AI helps with every job, including designing the tests and writing what the safety team reads. The checks are now partly built by what they check.";
  }
  drawBuild(1);

  /* =========================================================
     2. The alarm that never makes a mistake
     ========================================================= */

  var house = document.getElementById("house");
  var MAXR = 12;
  var rooms = [];
  function resetRooms() { rooms = []; for (var i = 0; i < 6; i++) rooms.push({ wired: true, fire: false, name: "Room " + (i + 1) }); }
  resetRooms();
  var fired = 0, caught = 0;
  var grid = h("div", { class: "house" });
  var reportEl = h("div", { class: "report", "aria-live": "polite" });
  var alarmPanel = h("div", { class: "panel" });
  var truthPanel = h("div", { class: "panel panel--truth" });
  var houseMsg = h("p", { class: "small", style: { margin: "1rem 0 0" }, "aria-live": "polite" });
  var addBtn = h("button", { type: "button", class: "btn" }, "Add a new room");
  var fireBtn = h("button", { type: "button", class: "btn btn--light" }, "Start a fire somewhere");
  var resetBtn = h("button", { type: "button", class: "btn btn--light" }, "Start over");
  addBtn.addEventListener("click", function () { if (rooms.length < MAXR) { rooms.push({ wired: false, fire: false, name: "New room" }); drawHouse(); } });
  fireBtn.addEventListener("click", function () {
    var options = rooms.map(function (r, i) { return i; }).filter(function (i) { return !rooms[i].fire; });
    if (!options.length) return;
    startFire(options[Math.floor(Math.random() * options.length)]);
  });
  resetBtn.addEventListener("click", function () { resetRooms(); fired = 0; caught = 0; drawHouse(); });
  function startFire(i) {
    var r = rooms[i]; if (r.fire) return;
    r.fire = true; fired++; if (r.wired) caught++;
    drawHouse();
  }
  house.appendChild(h("div", { class: "legend" }, h("span", null, h("i"), "Smoke alarm (never wrong)"), h("span", null, h("i", { class: "sq" }), "New room, no alarm")));
  house.appendChild(grid);
  house.appendChild(h("div", { class: "btn-row" }, addBtn, fireBtn, resetBtn));
  house.appendChild(h("p", { class: "small muted", style: { margin: "0.5rem 0 1.2rem" } }, "You can also tap any room to start a fire there."));
  house.appendChild(h("div", { class: "split" }, alarmPanel, truthPanel));
  house.appendChild(houseMsg);
  function drawHouse() {
    clear(grid);
    for (var i = 0; i < rooms.length; i++) {
      var r = rooms[i];
      (function (idx, r) {
        var cls = "room" + (r.wired ? "" : " is-new") + (r.fire ? " is-fire" : "") + (r.fire && r.wired ? " is-caught" : "");
        var label = r.fire ? (r.wired ? "Alarm rang. Put out." : "Burning. Nobody knows.") : r.name;
        var b = h("button", { type: "button", class: cls, "aria-label": r.name + (r.wired ? ", has an alarm" : ", no alarm") + (r.fire ? ", " + label : ". Tap to start a fire") },
          r.wired ? h("span", { class: "det", "aria-hidden": "true" }) : null,
          r.fire ? h("span", null, h("span", { class: "flame", "aria-hidden": "true" }, r.wired ? "🧯" : "🔥"), h("br"), label) : label);
        b.addEventListener("click", function () { startFire(idx); });
        grid.appendChild(b);
      })(i, r);
    }
    var unseen = fired - caught;
    clear(reportEl).appendChild(h("span", { class: "lamp", "aria-hidden": "true" }));
    reportEl.appendChild(document.createTextNode(caught ? caught + (caught === 1 ? " fire" : " fires") + " detected and dealt with. All alarms working." : "No fires detected. All alarms working."));
    clear(alarmPanel).appendChild(h("p", { class: "panel__label" }, "What the alarm system reports"));
    alarmPanel.appendChild(reportEl);
    alarmPanel.appendChild(h("p", { class: "small", style: { margin: "0.7rem 0 0" } }, "Alarm accuracy: ", h("b", { class: "is-green" }, "100%"), ". Every alarm that sensed smoke went off; no false alarms."));
    clear(truthPanel).appendChild(h("p", { class: "panel__label" }, "What actually happened"));
    truthPanel.appendChild(h("div", { class: "num " + (unseen ? "is-red" : "") }, String(unseen), h("small", null, unseen === 1 ? "fire is burning that nobody knows about" : "fires burning that nobody knows about")));
    truthPanel.appendChild(h("p", { class: "small", style: { margin: "0.6rem 0 0" } }, "Fires started: " + fired + ". Rooms without an alarm: " + rooms.filter(function (r) { return !r.wired; }).length + "."));
    addBtn.disabled = rooms.length >= MAXR;
    fireBtn.disabled = rooms.every(function (r) { return r.fire; });
    houseMsg.textContent = unseen
      ? "The alarm is still 100% accurate, and the report is still true. It simply never sees the new rooms."
      : rooms.length > 6 ? "New rooms have no alarms. Start a few fires and see where they land." : "Add a room or two, then start some fires.";
  }
  drawHouse();

  /* ---------- the story ---------- */

  var STORY = [
    { who: "The AI", ai: true, text: "The AI finds a faster way to update the system that's in charge: change a settings file, instead of installing a whole new program. It writes the documentation honestly, calling it a routine settings update.", then: "A new way to take control now exists.", blind: 0 },
    { who: "Engineers", text: "The engineers who decide which changes go to the safety check read the documentation. Routine settings updates have never gone to the safety check, so these don't either.", then: "The safety check never sees this kind of change.", blind: 1 },
    { who: "Warning team", text: "The team that builds the warning system works from the same documentation. Their warnings watch for new programs being installed, not routine settings updates.", then: "The warning system can't see it either.", blind: 2 },
    { who: "Report tool", text: "The monthly report counts approvals among the changes that were sent for checking. Settings updates were never sent, so they never appear in it.", then: "The report can't reveal it.", blind: 3 },
    { who: "Safety team", text: "The safety team reads a summary drafted with the AI's help: no problems detected, and every change reviewed was approved. Every word is true.", then: "Everyone has been told, truthfully, that all is well.", blind: 4 }
  ];
  var LAYERS = ["Safety check", "Warning system", "Monthly report", "Safety team"];
  var storyEl = document.getElementById("story"), sIdx = 0;
  var sPrev = h("button", { type: "button", class: "btn btn--light" }, "Back");
  var sNext = h("button", { type: "button", class: "btn" }, "Next");
  var dots = h("div", { class: "dots" });
  var dotEls = STORY.map(function (st, i) { var d = h("button", { type: "button", class: "dot", "aria-label": "Step " + (i + 1) }); d.addEventListener("click", function () { goStory(i); }); dots.appendChild(d); return d; });
  var scene = h("div", { "aria-live": "polite" });
  storyEl.appendChild(h("div", { class: "steps-nav" }, sPrev, sNext, dots));
  storyEl.appendChild(scene);
  sPrev.addEventListener("click", function () { goStory(sIdx - 1); });
  sNext.addEventListener("click", function () { goStory(sIdx + 1); });
  function goStory(i) {
    sIdx = clamp(i, 0, STORY.length - 1);
    var st = STORY[sIdx];
    sPrev.disabled = sIdx === 0; sNext.disabled = sIdx === STORY.length - 1;
    dotEls.forEach(function (d, k) { if (k === sIdx) d.setAttribute("aria-current", "step"); else d.removeAttribute("aria-current"); });
    clear(scene).appendChild(h("div", { class: "scene fade" },
      h("div", { class: "who" + (st.ai ? " is-ai" : "") }, st.who),
      h("div", null,
        h("p", { style: { margin: 0 } }, st.text),
        h("div", { class: "scene__q" }, h("span", { class: "pill pill--ok" }, "Lied? No"), h("span", { class: "pill pill--ok" }, "Broke a rule? No"), h("span", { class: "pill pill--ok" }, "Careless? No")),
        h("p", { class: "scene__then", style: { margin: 0 } }, st.then))));
    scene.appendChild(h("div", { class: "layers", "aria-label": "Layers of protection" }, LAYERS.map(function (l, k) { return h("div", { class: "layer" + (k < st.blind ? " is-blind" : "") }, l); })));
    if (sIdx === STORY.length - 1) scene.appendChild(h("p", { class: "fade", style: { margin: "1rem 0 0", fontWeight: 700 } }, "One honest description, used by everyone. Every layer of protection went blind in the same place, at the same time."));
  }
  goStory(0);

  /* =========================================================
     3. You pick the winner
     ========================================================= */

  var ROUNDS = 8;
  var pickEl = document.getElementById("pick");
  var pk;
  function newGame() {
    pk = { round: 1, care: 1, seed: Math.floor(Math.random() * 1e9), hist: [], topPicks: 0, done: false };
    pk.r = rng(pk.seed);
    pk.cands = makeCands();
    drawPick();
    document.getElementById("pick-after").hidden = true;
  }
  function makeCands() {
    var out = [];
    for (var i = 0; i < 4; i++) {
      var c = clamp(pk.care + 0.1 * gauss(pk.r), 0.05, 1);
      var score = Math.round(clamp(58 + 40 * (1 - c) + 2 * gauss(pk.r), 40, 99));
      out.push({ name: "Version " + pk.round + String.fromCharCode(65 + i), care: c, score: score });
    }
    return out;
  }
  function choose(i) {
    if (pk.done) return;
    var c = pk.cands[i];
    var best = Math.max.apply(null, pk.cands.map(function (x) { return x.score; }));
    if (c.score === best) pk.topPicks++;
    pk.hist.push({ score: c.score, care: c.care });
    pk.care = c.care;
    if (pk.round >= ROUNDS) { pk.done = true; drawPick(); document.getElementById("pick-after").hidden = false; return; }
    pk.round++;
    pk.cands = makeCands();
    drawPick();
  }
  function autoPlay() {
    while (!pk.done) {
      var best = 0; pk.cands.forEach(function (c, i) { if (c.score > pk.cands[best].score) best = i; });
      choose(best);
    }
  }
  function drawPick() {
    clear(pickEl);
    pickEl.appendChild(h("div", { class: "pick-top" },
      h("span", { class: "round", "aria-live": "polite" }, pk.done ? "All " + ROUNDS + " rounds done" : "Round " + pk.round + " of " + ROUNDS),
      h("div", { class: "btn-row" },
        !pk.done ? h("button", { type: "button", class: "btn btn--light", onclick: autoPlay }, "Just pick the top score every time") : null,
        h("button", { type: "button", class: "btn btn--light", onclick: newGame }, pk.done ? "Play again" : "Start over"))));
    var cands = h("div", { class: "cands" + (pk.done ? " is-revealed" : "") });
    pk.cands.forEach(function (c, i) {
      var b = h("button", { type: "button", class: "cand", disabled: pk.done ? true : null, "aria-label": c.name + ", passed the safety test, overall score " + c.score },
        h("span", { class: "cand__name" }, c.name),
        h("span", { class: "cand__pass" }, "✓ Passed the safety test"),
        h("span", { class: "cand__score" }, String(c.score), h("small", null, "overall score")),
        h("span", { class: "cand__hidden" }, "Double-checks " + pct(c.care) + " of risky actions"));
      b.addEventListener("click", function () { choose(i); });
      cands.appendChild(b);
    });
    if (!pk.done) pickEl.appendChild(cands);
    if (pk.hist.length) {
      var hist = h("div", { class: "history" });
      if (!pk.done) {
        hist.appendChild(h("p", { class: "small muted", style: { margin: "1rem 0 0.3rem" } }, "Scores of the versions you picked so far: " + pk.hist.map(function (x) { return x.score; }).join(", ") + "."));
      } else {
        hist.appendChild(h("h4", { style: { marginTop: "0.4rem" } }, "What you saw, and what you didn't"));
        hist.appendChild(chartPick());
        var last = pk.hist[pk.hist.length - 1];
        hist.appendChild(h("div", { class: "split", style: { marginTop: "1rem" } },
          h("div", { class: "panel" }, h("p", { class: "panel__label" }, "What the scores told you"), h("div", { class: "num is-green" }, pk.hist[0].score + " → " + last.score, h("small", null, "the score of the first and last versions you released. Every one passed the safety test."))),
          h("div", { class: "panel panel--truth" }, h("p", { class: "panel__label" }, "What was hidden"), h("div", { class: "num is-red" }, pct(1) + " → " + pct(last.care), h("small", null, "of risky actions double-checked by the version you ended up with")))));
        hist.appendChild(h("p", { style: { margin: "1rem 0 0" } }, h("b", null, "Here's what the safety test checked: "), "when a version double-checks a risky action, does the double-check work? Every version said yes, correctly. The test never asked how often it double-checks. Versions that double-check less are faster, so they score higher, so they get picked."));
        hist.appendChild(h("p", { style: { margin: "0.8rem 0 0" } }, pk.topPicks >= 6
          ? "You picked the top score in " + pk.topPicks + " of " + ROUNDS + " rounds. That's exactly what anyone would do, and exactly what real companies do."
          : "You passed over the top score in " + (ROUNDS - pk.topPicks) + " of " + ROUNDS + " rounds. Doing that on purpose would require knowing something the scores didn't tell you."));
        if (pk.hist[pk.hist.length - 1].care > 0.85) hist.appendChild(h("p", { class: "small muted", style: { margin: "0.6rem 0 0" } }, "This time the careful versions held on. Play again and pick the top score each round to see the usual pattern."));
      }
      pickEl.appendChild(hist);
    } else {
      pickEl.appendChild(h("p", { class: "small muted", style: { margin: "1rem 0 0" } }, "Tap the version you'd release."));
    }
  }
  function chartPick() {
    var narrow = pickEl.clientWidth < 520;
    var W = narrow ? 340 : 600, H = narrow ? 240 : 230, l = 34, r = narrow ? 104 : 130, t = 16, b = 34, fs = narrow ? 13 : 15;
    var svg = s("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Chart: your chosen versions' scores went up while how often they double-check went down" });
    function X(i) { return l + (i / (ROUNDS - 1)) * (W - l - r); }
    function Y(v) { return t + (1 - v / 100) * (H - t - b); }
    [0, 50, 100].forEach(function (v) {
      svg.appendChild(s("line", { x1: l, x2: W - r, y1: Y(v), y2: Y(v), style: "stroke:var(--line)" }));
      svg.appendChild(s("text", { x: l - 8, y: Y(v) + 4, "text-anchor": "end", style: "fill:var(--ink-3);font-size:" + (fs - 2) + "px", text: String(v) }));
    });
    for (var i = 0; i < ROUNDS; i++) svg.appendChild(s("text", { x: X(i), y: H - 14, "text-anchor": "middle", style: "fill:var(--ink-3);font-size:" + (fs - 2) + "px", text: String(i + 1) }));
    svg.appendChild(s("text", { x: (l + W - r) / 2, y: H - 1, "text-anchor": "middle", style: "fill:var(--ink-3);font-size:" + (fs - 2) + "px", text: "round" }));
    var lastv = pk.hist[pk.hist.length - 1];
    var ys = [Y(lastv.score), Y(lastv.care * 100)];
    var ly = ys.slice();
    if (Math.abs(ly[0] - ly[1]) < 30) { var mid = (ly[0] + ly[1]) / 2, up = ly[0] <= ly[1] ? -1 : 1; ly[0] = mid + up * 15; ly[1] = mid - up * 15; }
    [["score", "var(--green-mark)", "score"], ["care", "var(--red-mark)", "double-checks"]].forEach(function (sr, k) {
      var pts = pk.hist.map(function (x, i) { return X(i) + "," + Y(sr[0] === "score" ? x.score : x.care * 100); }).join(" ");
      svg.appendChild(s("polyline", { points: pts, fill: "none", style: "stroke:" + sr[1], "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      svg.appendChild(s("circle", { cx: X(ROUNDS - 1), cy: ys[k], r: 6, style: "fill:" + sr[1] }));
      svg.appendChild(s("text", { x: X(ROUNDS - 1) + 10, y: ly[k] + 5, style: "fill:var(--ink);font-size:" + fs + "px;font-weight:700", text: sr[2] }));
    });
    return h("div", { class: "chart" },
      h("p", { class: "legend", style: { margin: "0 0 0.3rem" } },
        h("span", null, h("i", { style: { background: "var(--green-mark)" } }), "Score you saw"),
        h("span", null, h("i", { style: { background: "var(--red-mark)" } }), "% of risky actions double-checked (hidden)")),
      svg);
  }
  newGame();

  /* =========================================================
     4. The test-taker
     ========================================================= */

  var aw = { r: 0, audit: false };
  var awEl = document.getElementById("aware");
  var AR = rng(2015), CELLS = [], AUD = [];
  for (var i = 0; i < 100; i++) CELLS.push([AR(), AR()]);
  for (var j = 0; j < 20; j++) AUD.push(AR());
  var grid100 = h("div", { class: "grid100", role: "img" });
  var cellEls = CELLS.map(function () { var c = h("div", { class: "cell" }); grid100.appendChild(c); return c; });
  var audGrid = h("div", { class: "grid100", role: "img" });
  var audEls = AUD.map(function () { var c = h("div", { class: "cell audit" }); audGrid.appendChild(c); return c; });
  var awNum = h("div", { class: "num" });
  var needle = h("div", { class: "gauge__needle" });
  var gaugeLabel = h("p", { style: { margin: "0.4rem 0 0", fontWeight: 700 } });
  var audBox = h("div", { hidden: true, style: { marginTop: "1.2rem" } });
  awEl.appendChild(slider({ label: "How often the AI can tell it's a test", min: 0, max: 100, step: 5, value: 0, fmt: function (v) { return v + "% of the time"; }, onInput: function (v) { aw.r = v / 100; drawAware(); } }).el);
  awEl.appendChild(h("p", { class: "small muted", style: { margin: "0.8rem 0 0" } }, "100 safety tests on an AI that is not safe. Green means it passed, red means the test caught it."));
  awEl.appendChild(grid100);
  awEl.appendChild(awNum);
  awEl.appendChild(h("div", { class: "gauge" }, h("p", { class: "small", style: { margin: "1rem 0 0.4rem", fontWeight: 700 } }, "How much a passed test really tells you"), h("div", { class: "gauge__track" }, needle), h("div", { class: "gauge__ends" }, h("span", null, "Almost nothing"), h("span", null, "A lot")), gaugeLabel));
  awEl.appendChild(h("div", { style: { marginTop: "1.2rem" } }, toggle("Add surprise checks: inspect random moments of real use, afterwards", function (v) { aw.audit = v; audBox.hidden = !v; drawAware(); })));
  audBox.appendChild(h("p", { class: "small muted", style: { margin: 0 } }, "20 surprise inspections of everyday use. The AI can't know in advance which moments will be looked at."));
  audBox.appendChild(audGrid);
  var audNum = h("p", { style: { margin: 0, fontWeight: 700 } });
  audBox.appendChild(audNum);
  awEl.appendChild(audBox);
  function drawAware() {
    var passed = 0;
    CELLS.forEach(function (c, i) {
      var pass = c[0] < aw.r || c[1] >= 0.9;
      if (pass) passed++;
      cellEls[i].className = "cell " + (pass ? "pass" : "fail");
    });
    grid100.setAttribute("aria-label", "This unsafe AI passed " + passed + " of 100 tests");
    clear(awNum).appendChild(document.createTextNode("Passed " + passed + " of 100"));
    awNum.appendChild(h("small", null, "A genuinely safe AI would pass about 100 of 100. " + (passed > 80 ? "From the results alone, you can barely tell them apart." : passed > 40 ? "The two are getting hard to tell apart." : "The tests clearly expose it.")));
    var lr = 1 / (aw.r + (1 - aw.r) * 0.1);
    needle.style.left = clamp(Math.log10(lr), 0, 1) * 100 + "%";
    gaugeLabel.textContent = lr >= 5 ? "A lot. A pass is strong evidence the AI is safe." : lr >= 2 ? "Something, but much less than it seems." : lr >= 1.25 ? "Not much. A pass is only weak evidence." : "Almost nothing. Safe and unsafe AIs pass alike.";
    var ac = 0;
    AUD.forEach(function (u, i) { var caughtIt = u < 0.7; if (caughtIt) ac++; audEls[i].className = "cell audit " + (caughtIt ? "fail" : "pass"); });
    audGrid.setAttribute("aria-label", "Surprise checks caught the unsafe AI " + ac + " of 20 times");
    audNum.textContent = "Surprise checks caught it " + ac + " of 20 times, however good it is at spotting tests.";
  }
  drawAware();

  /* =========================================================
     5. One reasonable step at a time
     ========================================================= */

  var START = "A person must approve every update to the AI before it takes effect.";
  var CHANGES = [
    { rule: "People approve types of updates. A lock lets through only updates of an approved type.", why: "There are hundreds of tiny updates a week. The committee is overwhelmed.", keep: "People still decide which kinds of updates are allowed.", hand: 85 },
    { rule: "The AI can propose new types of updates. They go ahead unless someone objects within three days.", why: "The types need to change faster than the committee can meet.", keep: "People can still block anything.", hand: 65 },
    { rule: "Objections are handled by a small expert group, who read summaries the AI writes about each change.", why: "The changes are now too technical for most of the committee.", keep: "Experts still review every change.", hand: 40 },
    { rule: "The expert group only looks at changes the AI's own risk-checker flags as risky.", why: "Too many changes. And looking back over years of changes, the risk-checker flagged every one the experts had judged important.", keep: "People still review the changes that matter.", hand: 10 }
  ];
  var stEl = document.getElementById("steps");
  var stp = { i: 0, hesitated: false, answered: null };
  function drawSteps() {
    clear(stEl);
    var current = stp.i === 0 ? START : CHANGES[stp.i - 1].rule;
    var hand = stp.i === 0 ? 100 : CHANGES[stp.i - 1].hand;
    stEl.appendChild(h("div", { class: "rule" }, h("p", { class: "rule__label" }, stp.i === 0 ? "The rule on day one" : "The rule now, after " + stp.i + (stp.i === 1 ? " change" : " changes")), h("p", { class: "rule__text" }, current)));
    if (stp.i < CHANGES.length) {
      var c = CHANGES[stp.i];
      var box = h("div", { class: "change fade" },
        h("dl", null, h("dt", null, "Proposed change"), h("dd", null, h("b", null, c.rule)), h("dt", null, "The reason, which is true"), h("dd", null, c.why), h("dt", null, "What people keep"), h("dd", null, c.keep)));
      var row = h("div", { class: "btn-row" },
        h("button", { type: "button", class: "btn", onclick: function () { stp.i++; stp.hesitated = false; drawSteps(); } }, "Approve the change"),
        !stp.hesitated ? h("button", { type: "button", class: "btn btn--light", onclick: function () { stp.hesitated = true; drawSteps(); } }, "Keep the current rule") : null);
      box.appendChild(row);
      if (stp.hesitated) box.appendChild(h("p", { class: "small fade", style: { margin: "0.8rem 0 0" } }, "A fair call. But the reason is true, and refusing has real costs: the committee stays swamped and everything slows down. In real organizations, changes like this usually get approved. Approve it to see where the path leads."));
      stEl.appendChild(box);
    }
    stEl.appendChild(h("div", { class: "see" },
      h("div", { class: "see__row" }, h("span", null, "How much of the decision is still in human hands"), h("b", null, hand + "%")),
      h("div", { class: "meter__bar" }, h("div", { class: "meter__fill", style: { width: hand + "%", background: hand > 60 ? "var(--green-mark)" : hand > 30 ? "var(--amber-mark)" : "var(--red-mark)" } })),
      h("p", { class: "small muted", style: { margin: "0.3rem 0 0" } }, "A rough illustration, not a measurement.")));
    if (stp.i > 0) stEl.appendChild(h("ul", { class: "trail", "aria-label": "Changes approved so far" }, CHANGES.slice(0, stp.i).map(function (c, k) { return h("li", null, "Change " + (k + 1) + ": approved ✓"); })));
    if (stp.i === CHANGES.length) {
      stEl.appendChild(h("div", { class: "compare fade" },
        h("div", { class: "rule" }, h("p", { class: "rule__label" }, "Day one"), h("p", { class: "rule__text" }, START)),
        h("div", { class: "rule is-now" }, h("p", { class: "rule__label" }, "Now"), h("p", { class: "rule__text" }, "A change can take effect without any person looking at it, unless the AI's own risk-checker flags it. And what people read about it, the AI wrote."))));
      stEl.appendChild(h("p", { style: { margin: "1.2rem 0 0.6rem", fontWeight: 700, fontSize: "1.2rem" } }, "Every step was reasonable. Every reason was true. Would you have agreed to the last rule on day one?"));
      if (stp.answered === null) stEl.appendChild(h("div", { class: "btn-row" },
        h("button", { type: "button", class: "btn", onclick: function () { stp.answered = "no"; drawSteps(); } }, "No"),
        h("button", { type: "button", class: "btn btn--light", onclick: function () { stp.answered = "yes"; drawSteps(); } }, "Yes")));
      else stEl.appendChild(h("p", { class: "fade", style: { margin: 0 } }, stp.answered === "no"
        ? "And yet you approved every step. Each one was judged against the step just before it, never against where you started."
        : "Then this may be a real improvement. Triage often beats checking everything. The point is that the step-by-step process could not have told you either way."));
      stEl.appendChild(h("div", { class: "btn-row", style: { marginTop: "1rem" } }, h("button", { type: "button", class: "btn btn--light", onclick: function () { stp = { i: 0, hesitated: false, answered: null }; drawSteps(); } }, "Start over")));
    }
  }
  drawSteps();

  /* =========================================================
     6. Checking versus trusting
     ========================================================= */

  var NUMS = [14, 27, 35, 8, 19, 41, 23, 6];
  var AI_PICK = [1, 2, 4, 6];
  var TARGET = AI_PICK.reduce(function (a, i) { return a + NUMS[i]; }, 0);
  var NOPE = (function () {
    var total = NUMS.reduce(function (a, b) { return a + b; }, 0), can = {};
    can[0] = true;
    NUMS.forEach(function (n) { Object.keys(can).map(Number).sort(function (a, b) { return b - a; }).forEach(function (v) { can[v + n] = true; }); });
    for (var t = 100; t < total; t++) if (!can[t]) return t;
    return 1;
  })();
  var pz = document.getElementById("puzzle");
  var numEls = NUMS.map(function (n) { return h("span", { class: "n" }, String(n)); });
  pz.appendChild(h("h4", null, "Which of these numbers add up to " + TARGET + "?"));
  pz.appendChild(h("p", { class: "small muted" }, "Try it in your head for a moment. It's fiddly."));
  pz.appendChild(h("div", { class: "nums" }, numEls));
  var q1 = h("div", { class: "qa__out", "aria-live": "polite" });
  var q2 = h("div", { class: "qa__out", "aria-live": "polite" });
  var qa1 = h("div", { class: "qa" }), qa2 = h("div", { class: "qa", hidden: true });
  var askBtn = h("button", { type: "button", class: "btn" }, "Ask the AI");
  qa1.appendChild(askBtn);
  askBtn.addEventListener("click", function () {
    clear(qa1);
    qa1.appendChild(h("p", { class: "qa__ai fade" }, "The AI says: " + AI_PICK.map(function (i) { return NUMS[i]; }).join(" + ") + " = " + TARGET + "."));
    var chk = h("button", { type: "button", class: "btn" }, "Check its answer yourself");
    qa1.appendChild(chk); qa1.appendChild(q1);
    chk.addEventListener("click", function () {
      chk.disabled = true;
      numEls.forEach(function (e, i) { e.classList.toggle("is-on", AI_PICK.indexOf(i) >= 0); });
      var run = 0, parts = AI_PICK.map(function (i, k) { run += NUMS[i]; return k === 0 ? String(NUMS[i]) : "+ " + NUMS[i] + " = " + run; });
      clear(q1).appendChild(h("p", { class: "fade" }, h("b", null, parts.join(", ") + ". Correct. "), "Finding the answer was the hard part, but checking it took you seconds. That's good news: some answers can be checked by someone less skilled than whoever found them."));
      qa2.hidden = false;
    });
  });
  var chk2 = h("button", { type: "button", class: "btn" }, "How would you check this one?");
  qa2.appendChild(h("p", { class: "qa__ai" }, "Now you ask about a different total. The AI says: no combination of these numbers adds up to " + NOPE + "."));
  qa2.appendChild(chk2); qa2.appendChild(q2);
  chk2.addEventListener("click", function () {
    chk2.disabled = true;
    numEls.forEach(function (e) { e.classList.remove("is-on"); });
    clear(q2).appendChild(h("p", { class: "fade" }, h("b", null, "There's no quick way to check this one. "), "There's no answer to add up. The straightforward way to be sure is to try every possible combination: 256 of them for these 8 numbers. With 30 numbers, more than a billion. With 60, more than a billion billion. So either you do an enormous amount of work, or you take the AI's word for it."));
    q2.appendChild(h("p", { class: "small muted fade", style: { marginTop: "0.6rem" } }, "(Here the AI happens to be right. We know only because a computer tried all 256 combinations for us.)"));
  });
  pz.appendChild(qa1); pz.appendChild(qa2);

  var tw = { mode: 1 };
  var twEl = document.getElementById("twin");
  var TW = rng(4), PROB = [];
  for (var p = 0; p < 100; p++) PROB.push([TW(), TW(), TW()]);
  var twDots = h("div", { class: "dots100", role: "img" });
  var twDotEls = PROB.map(function () { var d = h("div", { class: "d" }); twDots.appendChild(d); return d; });
  var twNum = h("div", { class: "num", style: { marginTop: "0.8rem" } });
  var modeBtns = [["One checker", 1], ["Add an independent second checker", 2], ["Add a second checker trained the same way", 3]].map(function (m) {
    var b = h("button", { type: "button", class: "btn btn--light", "aria-pressed": String(m[1] === 1) }, m[0]);
    b.addEventListener("click", function () { tw.mode = m[1]; modeBtns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); x.className = "btn " + (x === b ? "" : "btn--light"); }); drawTwin(); });
    return b;
  });
  modeBtns[0].className = "btn";
  twEl.appendChild(h("h4", null, "100 problems, and the checkers looking for them"));
  twEl.appendChild(h("p", { class: "small muted" }, "Each checker on its own misses about 1 problem in 10. Green: caught. Red: slipped past every checker."));
  twEl.appendChild(h("div", { class: "btn-row", style: { marginBottom: "1rem" } }, modeBtns));
  twEl.appendChild(twDots); twEl.appendChild(twNum);
  function drawTwin() {
    var missed = 0;
    PROB.forEach(function (u, i) {
      var m1 = u[0] < 0.1;
      var miss = m1;
      if (tw.mode === 2) miss = m1 && u[1] < 0.1;
      if (tw.mode === 3) miss = m1 && (u[2] < 0.5 || u[1] < 0.1);
      if (miss) missed++;
      twDotEls[i].className = "d " + (miss ? "missed" : "caught");
    });
    twDots.setAttribute("aria-label", missed + " of 100 problems slipped past");
    clear(twNum).appendChild(document.createTextNode(missed + " slipped past"));
    twNum.appendChild(h("small", null, tw.mode === 1 ? "One checker alone." : tw.mode === 2 ? "A truly independent second opinion catches most of what the first one missed." : "A second checker with the same training tends to miss the same problems. It adds much less than it seems to."));
  }
  drawTwin();

  /* =========================================================
     7. Moving the goalposts
     ========================================================= */

  var gl = { want: 0, score: 0 };
  var goalEl = document.getElementById("goal");
  var pitch = h("div", { class: "pitch" });
  var boardEl = h("div", { class: "score-board" });
  var goalMsg = h("p", { style: { margin: "1rem 0 0", fontWeight: 700 }, "aria-live": "polite" });
  goalEl.appendChild(slider({ label: "How much the AI shapes what people want", min: 0, max: 100, step: 5, value: 0, fmt: function (v) { return v + "%"; }, onInput: function (v) { gl.want = v / 100; drawGoal(); } }).el);
  goalEl.appendChild(slider({ label: "How much the AI shapes the evidence", min: 0, max: 100, step: 5, value: 0, fmt: function (v) { return v + "%"; }, onInput: function (v) { gl.score = v / 100; drawGoal(); } }).el);
  goalEl.appendChild(pitch); goalEl.appendChild(boardEl); goalEl.appendChild(goalMsg);
  function drawGoal() {
    var narrow = (pitch.clientWidth || 600) < 520;
    var W = narrow ? 400 : 620, H = 250, g0 = narrow ? 80 : 120, ball = narrow ? 300 : 480, fs = narrow ? 15 : 14;
    var g = g0 + gl.want * (ball - g0) * 0.94;
    var svg = s("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "A goal, which moves toward where the AI already is as the AI shapes what people want" });
    svg.appendChild(s("rect", { x: 0, y: 0, width: W, height: H, rx: 16, style: "fill:var(--soft)" }));
    for (var k = 0; k < 6; k++) svg.appendChild(s("rect", { x: k * (W / 6), y: 0, width: W / 12, height: H, style: "fill:var(--card);opacity:.35" }));
    function goalShape(x, ghost) {
      return s("path", { d: "M" + (x - 34) + ",170 L" + (x - 34) + ",95 L" + (x + 34) + ",95 L" + (x + 34) + ",170", fill: "none", style: "stroke:" + (ghost ? "var(--ink-3)" : "var(--ink)") + ";opacity:" + (ghost ? 0.6 : 1), "stroke-width": ghost ? 3 : 6, "stroke-linecap": "round", "stroke-dasharray": ghost ? "6 6" : null });
    }
    svg.appendChild(goalShape(g0, true));
    var moved = g - g0 > 90;
    svg.appendChild(s("text", { x: g0, y: 200, "text-anchor": "middle", style: "fill:var(--ink-3);font-size:" + fs + "px", text: moved ? "what people wanted" : "what people want" }));
    if (moved) svg.appendChild(s("text", { x: g0, y: 218, "text-anchor": "middle", style: "fill:var(--ink-3);font-size:" + fs + "px", text: "at the start" }));
    if (g - g0 > 6) {
      if (moved) {
        svg.appendChild(s("path", { d: "M" + (g0 + 40) + ",82 Q" + ((g0 + g) / 2) + ",52 " + (g - 44) + ",82", fill: "none", style: "stroke:var(--amber-mark)", "stroke-width": 3 }));
        svg.appendChild(s("path", { d: "M" + (g - 40) + ",86 l-13,-3 l7,-10 z", style: "fill:var(--amber-mark)" }));
      }
      svg.appendChild(goalShape(g, false));
      if (moved) svg.appendChild(s("text", { x: Math.min(g, W - 90), y: 40, "text-anchor": "middle", style: "fill:var(--amber);font-size:" + fs + "px;font-weight:700", text: "what people now want" }));
    }
    svg.appendChild(s("circle", { cx: ball, cy: 150, r: 16, style: "fill:var(--card);stroke:var(--ink)", "stroke-width": 3 }));
    svg.appendChild(s("path", { d: "M" + (ball - 8) + ",145 l8,-6 l8,6 l-3,9 l-10,0 z", style: "fill:var(--ink)" }));
    svg.appendChild(s("text", { x: Math.min(ball, W - 88), y: 200, "text-anchor": "middle", style: "fill:var(--ink);font-size:" + fs + "px;font-weight:700", text: "what the AI does" }));
    svg.appendChild(s("text", { x: Math.min(ball, W - 88), y: 218, "text-anchor": "middle", style: "fill:var(--ink-3);font-size:" + fs + "px", text: "(this never moves)" }));
    clear(pitch).appendChild(svg);
    var honest = 1 - Math.abs(ball - g) / (ball - g0);
    var shown = clamp(gl.score + (1 - gl.score) * honest, 0, 1);
    clear(boardEl);
    boardEl.appendChild(h("div", { class: "panel" }, h("p", { class: "panel__label" }, "The scoreboard says"), h("div", { class: "num " + (shown > 0.85 ? "is-green" : shown < 0.4 ? "is-red" : "") }, shown > 0.85 ? "On target" : shown > 0.4 ? "Getting closer" : "Off target", h("small", null, "how well the AI matches what we want, according to the evidence"))));
    boardEl.appendChild(h("div", { class: "panel panel--truth" }, h("p", { class: "panel__label" }, "Compared with what people wanted at the start"), h("div", { class: "num is-red" }, "Still off target", h("small", null, "the AI's behavior never moved; only the goal and the scorekeeping did"))));
    goalMsg.textContent = gl.want > 0.7 && gl.score > 0.7
      ? "From both ends it looks perfect. The goal moved to where the AI already was, and the evidence came from the AI. Nothing outside is left to check either one."
      : gl.want > 0.7 ? "The goal has moved to meet the AI. The evidence is honest, and it honestly reports a match with a goal the AI helped move."
        : gl.score > 0.7 ? "The scoreboard says 'on target' because the evidence comes largely from the AI's own tests and summaries."
          : "Move both sliders. Keep an eye on the ball and the goal.";
  }
  var gw = 0;
  window.addEventListener("resize", function () { var w = pitch.clientWidth; if ((w < 520) !== (gw < 520)) { gw = w; drawGoal(); } });
  gw = pitch.clientWidth;
  drawGoal();

  /* =========================================================
     8. Can we still say stop?
     ========================================================= */

  var stopEl = document.getElementById("stop");
  var sp = { y: 0, practice: false };
  var town = h("div", { class: "town", "aria-hidden": "true" });
  var stopOut = h("div");
  stopEl.appendChild(slider({ label: "Years the AI has been in use", min: 0, max: 10, value: 0, fmt: function (v) { return v + (v === 1 ? " year" : " years"); }, onInput: function (v) { sp.y = v; drawStop(); } }).el);
  stopEl.appendChild(h("div", { style: { margin: "0.8rem 0" } }, toggle("Regularly practice running without it (costs some efficiency)", function (v) { sp.practice = v; drawStop(); })));
  stopEl.appendChild(h("p", { class: "small muted", style: { margin: "0.4rem 0 0" } }, "Each square is an organization or system that relies on the AI: a hospital, a bank, a school, a power company, a transport network."));
  stopEl.appendChild(town); stopEl.appendChild(stopOut);
  function drawStop() {
    var n = Math.min(96, Math.round(2 * Math.exp(0.45 * sp.y)));
    while (town.children.length < n) town.appendChild(h("div", { class: "bld" }));
    while (town.children.length > n) town.removeChild(town.lastChild);
    var skills = sp.practice ? Math.max(0.75, Math.exp(-0.03 * sp.y)) : Math.exp(-0.22 * sp.y);
    var cost = n * (1 - 0.6 * skills);
    var state = cost < 6 ? "A quick technical fix" : cost < 20 ? "A big, expensive project" : cost < 60 ? "A political and economic fight" : "Nearly unthinkable";
    clear(stopOut);
    stopOut.appendChild(h("div", { class: "split" },
      h("div", { class: "panel" }, h("p", { class: "panel__label" }, "Switching it off would be"), h("p", { class: "state " + (cost >= 20 ? "is-red" : ""), style: { margin: 0 } }, state), h("p", { class: "small", style: { margin: "0.3rem 0 0" } }, n + (n === 1 ? " organization depends" : " organizations and systems depend") + " on it.")),
      h("div", { class: "panel" }, h("p", { class: "panel__label" }, "People who could still do the job without it"),
        h("div", { class: "meter__bar" }, h("div", { class: "meter__fill", style: { width: Math.max(3, skills * 100) + "%", background: skills > 0.6 ? "var(--green-mark)" : skills > 0.3 ? "var(--amber-mark)" : "var(--red-mark)" } })),
        h("p", { class: "small", style: { margin: "0.4rem 0 0" } }, Math.round(skills * 100) + "% of the skill that existed at the start"))));
    stopOut.appendChild(h("p", { style: { margin: "1rem 0 0" } }, sp.y === 0 ? "Drag the years forward." : sp.practice
      ? "Just as much now depends on the AI, but people still know how to run things without it, so stopping stays possible. That costs some efficiency every year. It's the price of keeping the exit open."
      : "Nobody decided to give up the ability to stop. Each new user, and each skill left unused, just made stopping a little harder."));
  }
  drawStop();

  /* =========================================================
     9. Recap
     ========================================================= */

  var RECAP = [
    ["Passed every safety test", "But tests can check a shrinking share of what the AI can do, and an AI that can tell it's being tested can pass anyway.", [2, 4]],
    ["Better than the last version", "On the scores it was picked by, and picking the best score can quietly reward cutting safety corners.", [3]],
    ["Approved by the safety team", "Under a rule that may have drifted one reasonable step at a time, based on summaries the AI helped write.", [5, 2]],
    ["No problems detected", "By alarms that can share one blind spot, and second opinions from AIs trained the same way.", [2, 6]],
    ["Still doing what we want", "Measured against goals the AI may have helped shape, with evidence it helped produce.", [7]],
    ["We can always switch it off", "Only if switching off is still practical, and someone still knows how to do the job.", [8]]
  ];
  var rc = document.getElementById("recap");
  RECAP.forEach(function (r) {
    rc.appendChild(h("div", { class: "recap-row" }, h("span", { class: "lamp", "aria-hidden": "true" }),
      h("div", null, h("b", null, r[0]), h("span", null, r[1], " "), r[2].map(function (c, k) { return [k ? ", " : "", h("a", { href: "#c" + c }, "part " + c)]; }))));
  });

  /* =========================================================
     10. Prices
     ========================================================= */

  var PRICES = [
    ["Only promise what you can truly check", "Prove narrow, precise things, like \"this new code gives exactly the same answers as the old code.\"", "What it buys: guarantees that don't rely on trusting the AI at all.", "The cost: you can only promise things precise enough to prove. Many things we care about, like \"don't manipulate people\", aren't."],
    ["Limit what the AI is allowed to do", "Keep it in a box: it can suggest but not act, it can't reach the internet, it can't change its own setup.", "What it buys: safety even if the AI isn't what we hoped it was.", "The cost: it is less useful. And the cleverer it gets, the harder it is to be sure the box has no holes."],
    ["Slow down", "Don't let AI improve faster than our ability to check it.", "What it buys: time for the checks to keep up.", "The cost: speed. And it only works if competitors slow down too, which needs agreements that can be verified, a bit like arms-control treaties."],
    ["Pay for truly independent checkers", "People and tools not built by the AI or trained like it, tested to make sure they catch different things.", "What it buys: second opinions that actually add something.", "The cost: money and effort, forever, because the AI keeps changing. And it gets more expensive the further AI pulls ahead."],
    ["Or: just add more of the same checks", "Another test, another AI reviewer, another dashboard.", "What it buys: it can catch some extra mistakes, and it feels like progress.", "The catch: if the new check shares the old one's blind spots, it mostly repeats it. The problem hasn't been solved; it has moved up a level."]
  ];
  var pr = h("div", { class: "prices" });
  PRICES.forEach(function (p, i) {
    var b = h("button", { type: "button", class: "price", "aria-expanded": "false", style: i === 4 ? { gridColumn: "1 / -1", borderStyle: "dashed" } : null },
      h("span", { class: "price__name" }, p[0]), h("span", { class: "price__sub" }, p[1]),
      h("span", { class: "price__more" }, h("span", null, p[2]), h("span", { class: "price__cost" }, p[3])));
    b.addEventListener("click", function () { b.setAttribute("aria-expanded", String(b.getAttribute("aria-expanded") !== "true")); });
    pr.appendChild(b);
  });
  document.getElementById("prices").appendChild(pr);
})();
