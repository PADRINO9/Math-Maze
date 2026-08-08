(() => {
  "use strict";

  const body = document.body;
  const header = document.querySelector("[data-site-header]");
  const nav = document.getElementById("site-nav");
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = Array.from(document.querySelectorAll(".site-nav a[href^='#']"));
  const enterElements = Array.from(document.querySelectorAll("[data-enter]"));
  const shareButtons = Array.from(document.querySelectorAll("[data-share]"));
  const shareToast = document.querySelector("[data-share-toast]");
  const shareMessage = document.querySelector("[data-share-message]");
  const toastClose = document.querySelector("[data-toast-close]");
  const leaderboardStatus = document.querySelector("[data-leaderboard-status]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileNav = window.matchMedia("(max-width: 860px)");
  let toastTimer = 0;

  function setHeaderState() {
    header?.classList.toggle("is-scrolled", window.scrollY > 18);
  }

  function closeNavigation({ restoreFocus = false } = {}) {
    if (!nav || !navToggle) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "פתיחת תפריט הניווט");
    body.classList.remove("nav-open");
    if (restoreFocus) navToggle.focus();
  }

  function openNavigation() {
    if (!nav || !navToggle) return;
    nav.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "סגירת תפריט הניווט");
    body.classList.add("nav-open");
    nav.querySelector("a")?.focus();
  }

  function setupNavigation() {
    navToggle?.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      if (isOpen) closeNavigation({ restoreFocus: true });
      else openNavigation();
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => closeNavigation());
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && navToggle?.getAttribute("aria-expanded") === "true") {
        event.preventDefault();
        closeNavigation({ restoreFocus: true });
      }
    });

    document.addEventListener("pointerdown", (event) => {
      if (navToggle?.getAttribute("aria-expanded") !== "true") return;
      if (nav?.contains(event.target) || navToggle?.contains(event.target)) return;
      closeNavigation();
    });

    mobileNav.addEventListener?.("change", (event) => {
      if (!event.matches) closeNavigation();
    });
  }

  function setupActiveNavigation() {
    const sections = navLinks
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    if (!("IntersectionObserver" in window) || sections.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      const activeEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!activeEntry) return;
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${activeEntry.target.id}`;
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, {
      rootMargin: "-32% 0px -58% 0px",
      threshold: [0, 0.2, 0.5]
    });

    sections.forEach((section) => observer.observe(section));
  }

  function setupEntranceMotion() {
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
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
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.08
    });

    document.documentElement.classList.add("landing-motion");
    enterElements.forEach((element) => observer.observe(element));
  }

  function getShareUrl() {
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    return isLocal && canonical ? canonical : `${window.location.origin}${window.location.pathname}`;
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    if (!copied) throw new Error("copy_failed");
  }

  function hideToast() {
    if (!shareToast) return;
    shareToast.hidden = true;
    shareToast.classList.remove("is-error");
    window.clearTimeout(toastTimer);
  }

  function showToast(message, isError = false) {
    if (!shareToast || !shareMessage) return;
    shareMessage.textContent = message;
    shareToast.classList.toggle("is-error", isError);
    shareToast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(hideToast, 5600);
  }

  function setupSharing() {
    shareButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const shareData = {
          title: "כפלול — הכפל רודף אחריכם",
          text: "מבוך. שאלה. ניצחון. משחקים בכפלול ומנסים להגיע למקום הראשון באלוף האלופים.",
          url: getShareUrl()
        };

        try {
          if (navigator.share) {
            showToast("חלון השיתוף נפתח. בחרו למי לשלוח את האתגר.");
            await navigator.share(shareData);
            showToast("האתגר שותף בהצלחה.");
          } else {
            await copyText(shareData.url);
            showToast("הקישור הועתק. עכשיו אפשר לשלוח את האתגר.");
          }
        } catch (error) {
          if (error?.name === "AbortError") return;
          showToast(`לא הצלחנו לפתוח שיתוף. אפשר להעתיק ידנית: ${shareData.url}`, true);
        }
      });
    });

    toastClose?.addEventListener("click", hideToast);
  }

  function setLeaderboardStatus(message, state) {
    if (!leaderboardStatus) return;
    leaderboardStatus.classList.remove("is-online", "is-local");
    leaderboardStatus.classList.add(state);
    const text = leaderboardStatus.querySelector("strong");
    if (text) text.textContent = message;
  }

  async function checkLeaderboard() {
    if (!leaderboardStatus) return;

    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const endpoint = isLocal
      ? "https://math-maze-il.vercel.app/api/champions?capability=1"
      : "/api/champions?capability=1";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`leaderboard_${response.status}`);
      const payload = await response.json();
      if (payload?.publicAvailable) {
        setLeaderboardStatus("הדירוג העולמי פעיל — השיא הבא יכול להיות שלכם", "is-online");
      } else {
        setLeaderboardStatus("השיא נשמר במכשיר ויסתנכרן כשהדירוג זמין", "is-local");
      }
    } catch (_error) {
      setLeaderboardStatus("השיא נשמר במכשיר גם בלי חיבור", "is-local");
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function exposeVerificationApi() {
    window.__kaflulLanding = {
      ready: true,
      closeNavigation,
      getShareUrl,
      reducedMotion: reducedMotion.matches,
      getLeaderboardStatus() {
        return leaderboardStatus?.textContent?.replace(/\s+/g, " ").trim() || "";
      }
    };
  }

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  setupNavigation();
  setupActiveNavigation();
  setupEntranceMotion();
  setupSharing();
  checkLeaderboard();
  exposeVerificationApi();
  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });
  body.dataset.landingReady = "true";
})();
