/* ==========================================================================
   Long Shadow Yoga — shared script (vanilla JS, no dependencies)
   Every feature is progressive: pages read and work without JavaScript,
   and each module only runs when its markup is present.

   Modules
    1. Helpers
    2. Navigation (mobile drawer + dropdowns)
    3. Scroll reveal and arch-mask expansion
    4. Back to top
    5. Cookie consent (Accept / Reject / Manage) + Do Not Sell or Share
    6. Form validation with inline errors
    7. Accordions
    8. Filters (pose library, teacher directory, glossary)
    9. Sequence player (per-pose hold timers, pause, skip)
   10. Breath pacer
   11. Print buttons
   ========================================================================== */
(function () {
  "use strict";

  /* 1. Helpers ------------------------------------------------------------ */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var store = {
    get: function (key) { try { return JSON.parse(window.localStorage.getItem(key)); } catch (e) { return null; } },
    set: function (key, val) { try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage blocked: banner simply reappears next visit */ } }
  };
  function formatTime(total) {
    var m = Math.floor(total / 60), s = total % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  /* 2. Navigation --------------------------------------------------------- */
  function initNav() {
    var toggle = $("[data-nav-toggle]");
    var nav = $("[data-nav]");
    if (!nav) return;
    var desktop = window.matchMedia("(min-width: 1180px)");

    function closeSubs(except) {
      $$(".site-nav__trigger", nav).forEach(function (btn) {
        if (btn === except) return;
        btn.setAttribute("aria-expanded", "false");
        var sub = document.getElementById(btn.getAttribute("aria-controls"));
        if (sub) sub.classList.remove("is-open");
      });
    }
    function setDrawer(open) {
      if (!toggle) return;
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      if (!open) closeSubs();
    }

    if (toggle) {
      toggle.addEventListener("click", function () {
        setDrawer(toggle.getAttribute("aria-expanded") !== "true");
      });
    }

    $$(".site-nav__trigger", nav).forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = btn.getAttribute("aria-expanded") !== "true";
        closeSubs(btn);
        btn.setAttribute("aria-expanded", String(open));
        var sub = document.getElementById(btn.getAttribute("aria-controls"));
        if (sub) sub.classList.toggle("is-open", open);
      });
    });

    document.addEventListener("click", function (e) {
      if (desktop.matches && !e.target.closest(".site-nav__item")) closeSubs();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var openTrigger = $(".site-nav__trigger[aria-expanded='true']", nav);
      if (openTrigger) { closeSubs(); openTrigger.focus(); return; }
      if (toggle && toggle.getAttribute("aria-expanded") === "true") { setDrawer(false); toggle.focus(); }
    });
    // Close dropdowns when focus leaves them (keyboard users tabbing past)
    nav.addEventListener("focusout", function (e) {
      if (!desktop.matches) return;
      var item = e.target.closest(".site-nav__item");
      if (item && !item.contains(e.relatedTarget)) closeSubs();
    });
    desktop.addEventListener && desktop.addEventListener("change", function () { setDrawer(false); });
  }

  /* 3. Scroll reveal ------------------------------------------------------ */
  function initReveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    var targets = $$("[data-reveal], main .arch").filter(function (el) {
      return !el.closest("[data-no-reveal]");
    });
    var vh = window.innerHeight || 800;
    var pending = targets.filter(function (el) { return el.getBoundingClientRect().top > vh * 0.92; });
    if (!pending.length) return;

    $$("[data-reveal-group]").forEach(function (group) {
      $$("[data-reveal]", group).forEach(function (el, i) { el.style.transitionDelay = Math.min(i * 90, 360) + "ms"; });
    });
    pending.forEach(function (el) { el.classList.add("reveal-pending"); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("reveal-in");
        el.classList.remove("reveal-pending");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    pending.forEach(function (el) { io.observe(el); });

    // Safety net: never leave content hidden (print, hidden tabs, headless renders)
    window.addEventListener("beforeprint", function () {
      $$(".reveal-pending").forEach(function (el) { el.classList.remove("reveal-pending"); });
    });
  }

  /* 4. Back to top -------------------------------------------------------- */
  function initToTop() {
    var btn = $("[data-to-top]");
    if (!btn || !("IntersectionObserver" in window)) return;
    var sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:140vh;left:0;width:1px;height:1px;pointer-events:none;";
    document.body.appendChild(sentinel);
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      btn.classList.toggle("is-visible", !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(sentinel);
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      var top = document.getElementById("top");
      if (top) top.focus({ preventScroll: true });
    });
  }

  /* 5. Cookie consent ----------------------------------------------------- */
  /* No non-essential cookies or scripts load until the visitor opts in.
     Advertising and analytics vendors (for example Google AdSense or Google
     Analytics) must be loaded ONLY inside loadOptionalServices(). */
  var CONSENT_KEY = "lsy_consent_v1";
  var DNSS_KEY = "lsy_dnss_v1";
  var gpc = navigator.globalPrivacyControl === true;

  function currentConsent() { return store.get(CONSENT_KEY); }
  function optedOutOfSale() { return gpc || store.get(DNSS_KEY) === true; }

  function loadOptionalServices(consent) {
    // Placeholder hook. Example (do not enable until accounts are approved):
    // if (consent.analytics) { /* inject analytics script here */ }
    // if (consent.advertising && !optedOutOfSale()) { /* inject ad script here */ }
    // Non-personalized ads may be requested when advertising is false.
    document.dispatchEvent(new CustomEvent("lsy:consent", { detail: consent }));
  }

  function saveConsent(analytics, advertising) {
    var consent = {
      necessary: true,
      analytics: !!analytics,
      advertising: !!advertising && !optedOutOfSale(),
      gpc: gpc,
      updated: new Date().toISOString()
    };
    store.set(CONSENT_KEY, consent);
    loadOptionalServices(consent);
    return consent;
  }

  function initConsent() {
    var banner = $("[data-cookie-banner]");
    var dialog = $("[data-cookie-dialog]");
    var existing = currentConsent();

    function hideBanner() {
      if (banner) banner.hidden = true;
      document.body.classList.remove("has-cookie-banner");
    }
    function syncDialog() {
      if (!dialog) return;
      var c = currentConsent() || { analytics: false, advertising: false };
      var a = $("[data-consent='analytics']", dialog);
      var ad = $("[data-consent='advertising']", dialog);
      if (a) a.checked = !!c.analytics;
      if (ad) { ad.checked = !!c.advertising && !optedOutOfSale(); }
      var note = $("[data-gpc-note]", dialog);
      if (note) note.hidden = !optedOutOfSale();
    }
    function openDialog() {
      if (!dialog) return;
      syncDialog();
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    function closeDialog() {
      if (!dialog) return;
      if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open");
    }

    if (!existing && banner) {
      banner.hidden = false;
      document.body.classList.add("has-cookie-banner");
    } else if (existing) {
      loadOptionalServices(existing);
    }

    $$("[data-consent-accept]").forEach(function (b) { b.addEventListener("click", function () { saveConsent(true, true); hideBanner(); closeDialog(); announce("Cookie choice saved: all cookies accepted."); }); });
    $$("[data-consent-reject]").forEach(function (b) { b.addEventListener("click", function () { saveConsent(false, false); hideBanner(); closeDialog(); announce("Cookie choice saved: non-essential cookies rejected."); }); });
    $$("[data-consent-manage], [data-cookie-open]").forEach(function (b) { b.addEventListener("click", openDialog); });
    $$("[data-consent-save]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = dialog && $("[data-consent='analytics']", dialog);
        var ad = dialog && $("[data-consent='advertising']", dialog);
        saveConsent(a && a.checked, ad && ad.checked);
        hideBanner(); closeDialog(); announce("Cookie preferences saved.");
      });
    });
    $$("[data-consent-close]").forEach(function (b) { b.addEventListener("click", closeDialog); });

    // Do Not Sell or Share My Personal Information (privacy page control)
    var dnssBtn = $("[data-dnss-optout]");
    var dnssStatus = $("[data-dnss-status]");
    function renderDnss() {
      if (!dnssStatus) return;
      dnssStatus.textContent = optedOutOfSale()
        ? (gpc ? "Your browser is sending a Global Privacy Control signal. You are opted out of the sale or sharing of personal information on this browser." : "You are opted out of the sale or sharing of personal information on this browser.")
        : "You have not opted out on this browser.";
    }
    if (dnssBtn) {
      dnssBtn.addEventListener("click", function () {
        store.set(DNSS_KEY, true);
        var c = currentConsent() || { analytics: false };
        saveConsent(c.analytics, false);
        hideBanner();
        renderDnss();
        if (dnssStatus) dnssStatus.focus();
      });
    }
    renderDnss();
  }

  /* Shared polite live region for short status messages */
  var liveRegion;
  function announce(msg) {
    if (!liveRegion) {
      liveRegion = document.createElement("p");
      liveRegion.className = "visually-hidden";
      liveRegion.setAttribute("role", "status");
      liveRegion.setAttribute("aria-live", "polite");
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = "";
    window.setTimeout(function () { liveRegion.textContent = msg; }, 60);
  }

  /* 6. Form validation ---------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function fieldError(input) {
    var v = (input.type === "checkbox") ? input.checked : input.value.trim();
    var label = input.getAttribute("data-label") || "This field";
    if (input.required && (input.type === "checkbox" ? !v : v === "")) {
      return input.getAttribute("data-msg-required") || (input.type === "checkbox" ? "Please check this box to continue." : label + " is required.");
    }
    if (input.type === "email" && v && !EMAIL_RE.test(v)) {
      return input.getAttribute("data-msg-type") || "Enter an email address in the format name@example.com.";
    }
    if (input.type === "tel" && v && v.replace(/\D/g, "").length < 10) {
      return input.getAttribute("data-msg-type") || "Enter a 10-digit US phone number, for example +1 (520) 555-0164.";
    }
    var min = parseInt(input.getAttribute("minlength"), 10);
    if (min && v && v.length < min) {
      return input.getAttribute("data-msg-min") || label + " needs at least " + min + " characters.";
    }
    if (input.tagName === "SELECT" && input.required && !input.value) {
      return input.getAttribute("data-msg-required") || "Please choose an option.";
    }
    return "";
  }
  function showFieldError(input, msg) {
    var field = input.closest(".field") || input.closest(".check") || input.parentElement;
    var err = field && $(".field__error", field.classList.contains("check") ? field.parentElement : field);
    if (!err && field) err = $(".field__error", field);
    if (field && field.classList) field.classList.toggle("is-invalid", !!msg);
    if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    if (err) err.textContent = msg;
  }
  function initForms() {
    $$("form[data-validate]").forEach(function (form) {
      form.setAttribute("novalidate", "");
      var attempted = false;
      var inputs = $$("input, select, textarea", form).filter(function (el) { return el.type !== "hidden" && el.type !== "submit"; });

      inputs.forEach(function (input) {
        var evt = (input.type === "checkbox" || input.tagName === "SELECT") ? "change" : "blur";
        input.addEventListener(evt, function () { if (attempted || input.value) showFieldError(input, fieldError(input)); });
        input.addEventListener("input", function () { if (input.getAttribute("aria-invalid") === "true") showFieldError(input, fieldError(input)); });
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        attempted = true;
        var firstBad = null;
        inputs.forEach(function (input) {
          var msg = fieldError(input);
          showFieldError(input, msg);
          if (msg && !firstBad) firstBad = input;
        });
        var summary = $("[data-form-error]", form);
        if (firstBad) {
          if (summary) { summary.hidden = false; }
          firstBad.focus();
          return;
        }
        if (summary) summary.hidden = true;
        /* No backend is wired up in this static build. Connect the form's
           action to your email/CRM provider before launch, then keep this
           success state for the confirmation message. */
        var success = $("[data-form-success]", form) || $("[data-form-success]", form.parentElement);
        form.reset();
        attempted = false;
        if (success) {
          success.hidden = false;
          success.setAttribute("tabindex", "-1");
          success.focus();
        }
      });
    });
  }

  /* 7. Accordions --------------------------------------------------------- */
  function initAccordions() {
    $$("[data-accordion]").forEach(function (acc) {
      $$(".accordion__trigger", acc).forEach(function (btn) {
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        if (!panel) return;
        var open = btn.getAttribute("aria-expanded") === "true";
        panel.hidden = !open;
        btn.addEventListener("click", function () {
          var willOpen = btn.getAttribute("aria-expanded") !== "true";
          btn.setAttribute("aria-expanded", String(willOpen));
          panel.hidden = !willOpen;
          if (willOpen) {
            panel.classList.remove("is-opening");
            void panel.offsetWidth;
            panel.classList.add("is-opening");
          }
        });
      });
    });
    // Open an accordion item targeted by the URL hash
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      var trigger = target && (target.matches(".accordion__trigger") ? target : $(".accordion__trigger", target));
      if (trigger && trigger.getAttribute("aria-expanded") !== "true") trigger.click();
    }
  }

  /* 8. Filters ------------------------------------------------------------ */
  /* Markup contract:
     [data-filter-root]
       form[data-filter-form]   checkboxes / radios / selects with a name, plus input[data-filter-search]
       [data-filter-count]      receives "Showing X of Y <noun>"
       [data-filter-reset]      clears everything
       [data-filter-item]       data-<name>="token token" for each control name, optional data-search
       [data-filter-empty]      shown when nothing matches
     Within one group values are OR-ed; across groups they are AND-ed. */
  function initFilters() {
    $$("[data-filter-root]").forEach(function (root) {
      var form = $("[data-filter-form]", root);
      var items = $$("[data-filter-item]", root);
      var count = $("[data-filter-count]", root);
      var empty = $("[data-filter-empty]", root);
      var search = $("[data-filter-search]", root);
      var noun = root.getAttribute("data-filter-noun") || "items";
      if (!form || !items.length) return;
      form.addEventListener("submit", function (e) { e.preventDefault(); });

      function selected() {
        var groups = {};
        $$("input[type=checkbox]:checked, input[type=radio]:checked, select", form).forEach(function (el) {
          if (!el.name || !el.value || el.value === "all") return;
          (groups[el.name] = groups[el.name] || []).push(el.value);
        });
        return groups;
      }
      function apply() {
        var groups = selected();
        var q = search ? search.value.trim().toLowerCase() : "";
        var shown = 0;
        items.forEach(function (item) {
          var ok = Object.keys(groups).every(function (name) {
            var tokens = (item.getAttribute("data-" + name) || "").split(/\s+/);
            return groups[name].some(function (v) { return tokens.indexOf(v) !== -1; });
          });
          if (ok && q) {
            var hay = ((item.getAttribute("data-search") || "") + " " + item.textContent).toLowerCase();
            hay = hay.normalize ? hay.normalize("NFD").replace(/[̀-ͯ]/g, "") : hay;
            var qq = q.normalize ? q.normalize("NFD").replace(/[̀-ͯ]/g, "") : q;
            ok = hay.indexOf(qq) !== -1;
          }
          item.hidden = !ok;
          if (ok) shown++;
        });
        if (count) count.textContent = "Showing " + shown + " of " + items.length + " " + noun;
        if (empty) empty.hidden = shown !== 0;
        // Hide letter groups (glossary) that have no visible terms
        $$("[data-filter-group-wrap]", root).forEach(function (wrap) {
          wrap.hidden = !$$("[data-filter-item]", wrap).some(function (i) { return !i.hidden; });
        });
      }
      form.addEventListener("change", apply);
      if (search) search.addEventListener("input", apply);
      $$("[data-filter-reset]", root).forEach(function (btn) {
        btn.addEventListener("click", function () { form.reset(); apply(); if (search) search.focus(); });
      });
      apply();
    });
  }

  /* 9. Sequence player ---------------------------------------------------- */
  /* Reads <script type="application/json" data-player-data> inside [data-player]:
     { "poses": [ { "name": "", "sanskrit": "", "seconds": 30, "cue": "" } ] } */
  function initPlayers() {
    $$("[data-player]").forEach(function (root) {
      var dataEl = $("[data-player-data]", root);
      if (!dataEl) return;
      var data;
      try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
      var poses = data.poses || [];
      if (!poses.length) return;

      var el = {
        count: $("[data-player-count]", root), name: $("[data-player-name]", root),
        sanskrit: $("[data-player-sanskrit]", root), time: $("[data-player-time]", root),
        cue: $("[data-player-cue]", root), fill: $("[data-player-fill]", root),
        next: $("[data-player-next]", root), status: $("[data-player-status]", root),
        done: $("[data-player-done]", root),
        toggle: $("[data-player-toggle]", root), prev: $("[data-player-prev]", root),
        skip: $("[data-player-skip]", root), restart: $("[data-player-restart]", root)
      };
      var steps = $$("[data-seq-step]");
      var index = 0, remaining = poses[0].seconds, timer = null, endAt = 0;

      function render(announceChange) {
        var p = poses[index];
        if (el.count) el.count.textContent = "Pose " + (index + 1) + " of " + poses.length;
        if (el.name) el.name.textContent = p.name;
        if (el.sanskrit) el.sanskrit.textContent = p.sanskrit || "";
        if (el.cue) el.cue.textContent = p.cue || "";
        if (el.time) el.time.textContent = formatTime(remaining);
        if (el.fill) el.fill.style.transform = "scaleY(" + (1 - remaining / p.seconds).toFixed(3) + ")";
        if (el.next) el.next.textContent = poses[index + 1] ? "Up next: " + poses[index + 1].name + " (" + formatTime(poses[index + 1].seconds) + ")" : "Last pose of the sequence.";
        if (el.prev) el.prev.disabled = index === 0;
        steps.forEach(function (s, i) { s.classList.toggle("is-current", i === index); });
        if (announceChange && el.status) el.status.textContent = "Now: " + p.name + ", " + p.seconds + " seconds.";
      }
      function setRunning(on) {
        root.classList.toggle("is-running", on && !reduceMotion);
        if (el.toggle) {
          el.toggle.textContent = on ? "Pause" : (remaining < poses[index].seconds || index > 0 ? "Resume" : "Start");
          el.toggle.setAttribute("aria-pressed", String(on));
        }
      }
      function tick() {
        remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
        if (remaining <= 0) {
          if (index < poses.length - 1) {
            index++; remaining = poses[index].seconds; endAt = Date.now() + remaining * 1000;
            root.classList.remove("is-running"); render(true);
            window.requestAnimationFrame(function () { root.classList.toggle("is-running", !reduceMotion); });
            return;
          }
          stop(); remaining = 0; render(false);
          if (el.done) el.done.hidden = false;
          if (el.status) el.status.textContent = "Sequence complete.";
          if (el.toggle) el.toggle.textContent = "Start again";
          return;
        }
        render(false);
      }
      function start() {
        if (el.done && !el.done.hidden) { index = 0; remaining = poses[0].seconds; el.done.hidden = true; }
        endAt = Date.now() + remaining * 1000;
        timer = window.setInterval(tick, 250);
        setRunning(true);
        if (el.status) el.status.textContent = "Started: " + poses[index].name + ".";
      }
      function stop() { window.clearInterval(timer); timer = null; setRunning(false); }
      function go(i) {
        var running = !!timer; stop();
        index = Math.max(0, Math.min(poses.length - 1, i)); remaining = poses[index].seconds;
        if (el.done) el.done.hidden = true;
        render(true);
        if (running) start();
      }

      if (el.toggle) el.toggle.addEventListener("click", function () { if (timer) { stop(); if (el.status) el.status.textContent = "Paused."; } else start(); });
      if (el.prev) el.prev.addEventListener("click", function () { go(index - 1); });
      if (el.skip) el.skip.addEventListener("click", function () { go(index + 1); });
      if (el.restart) el.restart.addEventListener("click", function () { stop(); go(0); setRunning(false); if (el.toggle) el.toggle.textContent = "Start"; });
      document.addEventListener("visibilitychange", function () { if (timer) tick(); });
      render(false);
    });
  }

  /* 10. Breath pacer ------------------------------------------------------ */
  /* Pattern values are "inhale-holdIn-exhale-holdOut" in seconds, e.g. "4-0-6-0". */
  function initPacers() {
    $$("[data-pacer]").forEach(function (root) {
      var fill = $("[data-pacer-fill]", root), count = $("[data-pacer-count]", root);
      var phaseEl = $("[data-pacer-phase]", root), toggle = $("[data-pacer-toggle]", root);
      var rounds = $("[data-pacer-rounds]", root);
      var running = false, t = null, round = 0;

      function pattern() {
        var checked = $("input[name='pacer-pattern']:checked", root);
        return (checked ? checked.value : "4-0-4-0").split("-").map(Number);
      }
      function setFill(scale, seconds) {
        if (!fill) return;
        fill.style.transition = (reduceMotion || !seconds) ? "none" : "transform " + seconds + "s linear";
        fill.style.transform = "scaleY(" + scale + ")";
      }
      function runPhase(i) {
        if (!running) return;
        var p = pattern();
        var names = ["Breathe in", "Hold", "Breathe out", "Hold"];
        while (p[i] === 0) i = (i + 1) % 4;
        if (i === 0) { round++; if (rounds) rounds.textContent = "Round " + round; }
        var secs = p[i];
        if (phaseEl) phaseEl.textContent = names[i];
        if (i === 0) setFill(1, secs);
        if (i === 2) setFill(0.08, secs);
        var left = secs;
        if (count) count.textContent = left;
        t = window.setInterval(function () {
          left--;
          if (left > 0) { if (count) count.textContent = left; return; }
          window.clearInterval(t);
          runPhase((i + 1) % 4);
        }, 1000);
      }
      function stop() {
        running = false; window.clearInterval(t);
        if (phaseEl) phaseEl.textContent = "Paused";
        if (count) count.textContent = "";
        setFill(0.08, 0);
        if (toggle) { toggle.textContent = "Start pacing"; toggle.setAttribute("aria-pressed", "false"); }
      }
      if (toggle) toggle.addEventListener("click", function () {
        if (running) { stop(); return; }
        running = true; round = 0;
        toggle.textContent = "Stop"; toggle.setAttribute("aria-pressed", "true");
        runPhase(0);
      });
      $$("input[name='pacer-pattern']", root).forEach(function (r) {
        r.addEventListener("change", function () { if (running) { window.clearInterval(t); round = 0; setFill(0.08, 0); runPhase(0); } });
      });
    });
  }

  /* 11. Print buttons ----------------------------------------------------- */
  function initPrint() {
    $$("[data-print]").forEach(function (b) { b.addEventListener("click", function () { window.print(); }); });
  }

  /* Boot ------------------------------------------------------------------ */
  function boot() {
    initNav();
    initReveal();
    initToTop();
    initConsent();
    initForms();
    initAccordions();
    initFilters();
    initPlayers();
    initPacers();
    initPrint();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
