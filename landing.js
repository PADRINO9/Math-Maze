(function initKaflulLanding() {
  "use strict";

  const documentElement = document.documentElement;
  const body = document.body;
  const header = document.querySelector("[data-site-header]");
  const progressBar = document.querySelector(".page-progress");
  const mobilePlayBar = document.querySelector(".mobile-play-bar");
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#site-nav");
  const cursorAura = document.querySelector(".cursor-aura");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const enterElements = Array.from(document.querySelectorAll("[data-enter]"));
  const revealZones = Array.from(document.querySelectorAll("[data-reveal-zone]"));
  const journeySteps = Array.from(document.querySelectorAll("[data-journey-step]"));
  const journeyScreens = Array.from(document.querySelectorAll("[data-screen]"));
  const deviceCaption = document.querySelector("[data-device-caption]");
  const currentYear = document.querySelector("[data-current-year]");
  const installButton = document.querySelector("[data-install-button]");
  const installToast = document.querySelector("[data-install-toast]");

  let scrollTicking = false;
  let cursorTicking = false;
  let latestCursor = { x: -100, y: -100 };
  let installPrompt = null;
  let toastTimer = null;

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function updateScrollState() {
    const scrollTop = window.scrollY || documentElement.scrollTop;
    const scrollable = Math.max(documentElement.scrollHeight - window.innerHeight, 1);
    const progress = clamp(scrollTop / scrollable, 0, 1);

    documentElement.style.setProperty("--page-progress", progress.toFixed(4));
    progressBar?.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    header?.classList.toggle("is-scrolled", scrollTop > 24);

    if (mobilePlayBar) {
      const downloadSection = document.querySelector("#download");
      const downloadTop = downloadSection?.getBoundingClientRect().top ?? Infinity;
      const shouldShow = scrollTop > Math.min(window.innerHeight * 0.72, 620) && downloadTop > window.innerHeight * 0.72;
      mobilePlayBar.classList.toggle("is-visible", shouldShow);
    }

    scrollTicking = false;
  }

  function requestScrollUpdate() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateScrollState);
  }

  function updateCursor() {
    cursorAura?.style.setProperty("--cursor-x", `${latestCursor.x}px`);
    cursorAura?.style.setProperty("--cursor-y", `${latestCursor.y}px`);
    cursorTicking = false;
  }

  function handlePointerMove(event) {
    latestCursor = { x: event.clientX, y: event.clientY };
    cursorAura?.classList.add("is-visible");
    if (!cursorTicking) {
      cursorTicking = true;
      window.requestAnimationFrame(updateCursor);
    }

    const interactive = event.target.closest("a, button, summary, .world-card, .qr-card");
    cursorAura?.classList.toggle("is-over-action", Boolean(interactive));
  }

  function setRevealPosition(zone, clientX, clientY, activateClass = "is-pointer-active") {
    const bounds = zone.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const x = clamp(clientX - bounds.left, 0, bounds.width);
    const y = clamp(clientY - bounds.top, 0, bounds.height);
    zone.style.setProperty("--reveal-x", `${x}px`);
    zone.style.setProperty("--reveal-y", `${y}px`);
    zone.classList.add(activateClass);
  }

  function setupRevealZones() {
    revealZones.forEach((zone) => {
      zone.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "mouse" || event.pointerType === "pen") {
          setRevealPosition(zone, event.clientX, event.clientY);
        }
      });

      zone.addEventListener("pointermove", (event) => {
        if (event.pointerType === "mouse" || event.pointerType === "pen") {
          setRevealPosition(zone, event.clientX, event.clientY);
        }
      });

      zone.addEventListener("pointerleave", () => {
        zone.classList.remove("is-pointer-active");
      });

      zone.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "touch") {
          setRevealPosition(zone, event.clientX, event.clientY, "is-touch-active");
        }
      }, { passive: true });

      zone.addEventListener("pointerup", () => {
        window.setTimeout(() => zone.classList.remove("is-touch-active"), 900);
      }, { passive: true });
    });
  }

  function setJourneyStep(key) {
    const selectedStep = journeySteps.find((step) => step.dataset.journeyStep === key);
    if (!selectedStep) return;

    journeySteps.forEach((step) => {
      step.classList.toggle("is-active", step === selectedStep);
    });

    journeyScreens.forEach((screen) => {
      screen.classList.toggle("is-active", screen.dataset.screen === key);
    });

    if (deviceCaption) {
      deviceCaption.textContent = selectedStep.dataset.caption || "בתוך המשחק";
    }
  }

  function setupJourneyObserver() {
    if (!("IntersectionObserver" in window)) {
      journeySteps.forEach((step) => step.classList.add("is-active"));
      return;
    }

    const visibleSteps = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleSteps.set(entry.target, entry.intersectionRatio);
        } else {
          visibleSteps.delete(entry.target);
        }
      });

      let mostVisible = null;
      let bestRatio = -1;
      visibleSteps.forEach((ratio, step) => {
        if (ratio > bestRatio) {
          mostVisible = step;
          bestRatio = ratio;
        }
      });

      if (mostVisible?.dataset.journeyStep) {
        setJourneyStep(mostVisible.dataset.journeyStep);
      }
    }, {
      root: null,
      rootMargin: "-22% 0px -28% 0px",
      threshold: [0.05, 0.2, 0.4, 0.62]
    });

    journeySteps.forEach((step) => observer.observe(step));
  }

  function setupEntranceObserver() {
    if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
      enterElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: "0px 0px -9% 0px",
      threshold: 0.12
    });

    enterElements.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index % 3, 2) * 65}ms`;
      observer.observe(element);
    });
  }

  function setupNavigation() {
    navToggle?.addEventListener("click", () => {
      const willOpen = !body.classList.contains("nav-open");
      body.classList.toggle("nav-open", willOpen);
      navToggle.setAttribute("aria-expanded", String(willOpen));
      navToggle.setAttribute("aria-label", willOpen ? "סגירת תפריט" : "פתיחת תפריט");
    });

    nav?.addEventListener("click", (event) => {
      if (!event.target.closest("a")) return;
      body.classList.remove("nav-open");
      navToggle?.setAttribute("aria-expanded", "false");
      navToggle?.setAttribute("aria-label", "פתיחת תפריט");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !body.classList.contains("nav-open")) return;
      body.classList.remove("nav-open");
      navToggle?.setAttribute("aria-expanded", "false");
      navToggle?.focus();
    });

    const navLinks = Array.from(document.querySelectorAll(".site-nav a[href^='#']"));
    const sections = navLinks
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    if (!("IntersectionObserver" in window) || sections.length === 0) return;

    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${visible.target.id}`;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, {
      rootMargin: "-35% 0px -52% 0px",
      threshold: [0, 0.2, 0.5]
    });

    sections.forEach((section) => sectionObserver.observe(section));
  }

  function setupFaq() {
    const details = Array.from(document.querySelectorAll(".faq-list details"));
    details.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        details.forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  function showInstallToast() {
    if (!installToast) return;
    installToast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      installToast.hidden = true;
    }, 5200);
  }

  function setupInstallPrompt() {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event;
      if (installButton) installButton.hidden = false;
    });

    installButton?.addEventListener("click", async () => {
      if (!installPrompt) {
        showInstallToast();
        return;
      }

      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      installButton.hidden = true;
    });

    window.addEventListener("appinstalled", () => {
      installPrompt = null;
      if (installButton) installButton.hidden = true;
    });
  }

  function exposeVerificationApi() {
    window.__kaflulLanding = {
      ready: true,
      setJourneyStep,
      revealAt(selector, xRatio = 0.5, yRatio = 0.5) {
        const zone = document.querySelector(selector);
        if (!zone) return false;
        const bounds = zone.getBoundingClientRect();
        setRevealPosition(
          zone,
          bounds.left + bounds.width * clamp(xRatio, 0, 1),
          bounds.top + bounds.height * clamp(yRatio, 0, 1)
        );
        return true;
      },
      getActiveJourneyStep() {
        return document.querySelector("[data-journey-step].is-active")?.dataset.journeyStep || null;
      }
    };
  }

  if (currentYear) currentYear.textContent = String(new Date().getFullYear());

  setupRevealZones();
  setupJourneyObserver();
  setupEntranceObserver();
  setupNavigation();
  setupFaq();
  setupInstallPrompt();
  exposeVerificationApi();

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });

  if (hasFinePointer.matches && cursorAura) {
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", () => cursorAura.classList.remove("is-visible"));
  }

  prefersReducedMotion.addEventListener?.("change", (event) => {
    if (event.matches) {
      enterElements.forEach((element) => element.classList.add("is-visible"));
    }
  });

  updateScrollState();
  body.dataset.landingReady = "true";
})();
