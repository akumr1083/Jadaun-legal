/* =========================================================
   Jadaun Legal — interface behaviour
   ========================================================= */

(function () {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- loader ---------- */

  const loader = document.getElementById("loader");

  function dismissLoader() {
    if (!loader) return;
    root.classList.add("is-ready");
    window.setTimeout(() => loader.remove(), 1400);
  }

  if (document.readyState === "complete") {
    window.setTimeout(dismissLoader, 320);
  } else {
    window.addEventListener("load", () => window.setTimeout(dismissLoader, 320), {
      once: true,
    });
    window.setTimeout(dismissLoader, 2600);
  }

  /* ---------- nav ---------- */

  const nav = document.getElementById("nav");
  const menu = document.getElementById("menu");
  const menuBtn = document.getElementById("menuBtn");
  const progressBar = document.querySelector(".progress i");

  let scrollQueued = false;

  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(() => {
      const y = window.scrollY || window.pageYOffset;
      if (nav) nav.classList.toggle("is-scrolled", y > 24);

      if (progressBar) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? Math.min(1, y / max) : 0;
        progressBar.style.transform = "scaleX(" + ratio + ")";
      }

      scrollQueued = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    if (!menu || !menuBtn) return;
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("is-locked", open);
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });
  }

  if (menu) {
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) setMenu(false);
  });

  /* ---------- reveal on scroll ---------- */

  const revealItems = Array.from(document.querySelectorAll(".reveal"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("in"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* ---------- active nav link ---------- */

  const sections = Array.from(document.querySelectorAll("main section[id]"));
  const navLinks = Array.from(document.querySelectorAll(".nav__links a"));

  if (sections.length && navLinks.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach((link) => {
            link.classList.toggle(
              "is-active",
              link.getAttribute("href") === "#" + id
            );
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((section) => spy.observe(section));
  }

  /* ---------- tilt + pointer glow ---------- */

  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".tilt").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;

        card.style.setProperty("--mx", (px * 100).toFixed(2) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(2) + "%");

        const rotateX = (0.5 - py) * 6;
        const rotateY = (px - 0.5) * 8;

        card.style.transform =
          "perspective(1000px) rotateX(" +
          rotateX.toFixed(2) +
          "deg) rotateY(" +
          rotateY.toFixed(2) +
          "deg) translateY(-4px)";
      });

      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });

    document.querySelectorAll(".magnetic").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.14;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.2;
        element.style.transform = "translate(" + x.toFixed(2) + "px, " + y.toFixed(2) + "px)";
      });
      element.addEventListener("pointerleave", () => {
        element.style.transform = "";
      });
    });
  }

  /* ---------- cursor ---------- */

  if (finePointer && !reduceMotion) {
    const cursor = document.createElement("div");
    cursor.className = "cursor";
    cursor.setAttribute("aria-hidden", "true");
    document.body.appendChild(cursor);

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { x: target.x, y: target.y };
    let visible = false;
    let raf = 0;

    function follow() {
      current.x += (target.x - current.x) * 0.18;
      current.y += (target.y - current.y) * 0.18;
      cursor.style.transform =
        "translate3d(" + current.x.toFixed(1) + "px, " + current.y.toFixed(1) + "px, 0)";
      raf = window.requestAnimationFrame(follow);
    }

    window.addEventListener(
      "pointermove",
      (event) => {
        target.x = event.clientX;
        target.y = event.clientY;
        if (!visible) {
          visible = true;
          current.x = target.x;
          current.y = target.y;
          cursor.classList.add("is-visible");
          follow();
        }

        const hot = event.target.closest
          ? event.target.closest("a, button, .tilt, input, select, textarea")
          : null;
        cursor.classList.toggle("is-hot", Boolean(hot));
      },
      { passive: true }
    );

    document.addEventListener("pointerleave", () => {
      cursor.classList.remove("is-visible");
      visible = false;
      window.cancelAnimationFrame(raf);
    });
  }

  /* ---------- enquiry form ----------

     Submissions are posted to Web3Forms, which emails the firm and can
     forward to a Google Sheet, Slack, Telegram, etc. Paste the access key
     into the hidden `access_key` field in index.html. Until a key is set,
     the form falls back to opening the visitor's mail app.

     Swapping providers (Formspree, Netlify Forms, your own endpoint) only
     needs a different ENDPOINT and payload below.
  ------------------------------------------------------------------------- */

  const ENDPOINT = "https://api.web3forms.com/submit";
  const FALLBACK_EMAIL = "advabhaysingh07@gmail.com";

  const form = document.getElementById("enquiry");
  const status = document.getElementById("formStatus");
  const formNote = document.getElementById("formNote");
  const year = document.getElementById("year");

  if (year) year.textContent = String(new Date().getFullYear());

  if (form) {
    const keyField = form.querySelector('input[name="access_key"]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const key = keyField ? keyField.value.trim() : "";
    const configured = key.length > 0 && !/^YOUR/i.test(key);

    if (configured && formNote) {
      formNote.textContent =
        "Your enquiry goes directly to the firm's inbox — usually answered within one working day.";
    }

    function setStatus(message, isError) {
      if (!status) return;
      status.textContent = message;
      status.classList.toggle("is-error", Boolean(isError));
    }

    function mailFallback(data) {
      const matter = String(data.get("matter") || "General");
      const subject = "Consultation enquiry — " + matter;
      const body = [
        "Name: " + String(data.get("name") || ""),
        "Phone: " + (String(data.get("phone") || "").trim() || "—"),
        "Email: " + String(data.get("email") || ""),
        "Matter: " + matter,
        "",
        String(data.get("message") || ""),
      ].join("\n");

      setStatus("Opening your email client with these details…");
      window.location.href =
        "mailto:" + FALLBACK_EMAIL +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        return;
      }

      const data = new FormData(form);

      // honeypot: real visitors never tick this
      if (data.get("botcheck")) return;

      if (!configured) {
        mailFallback(data);
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      form.setAttribute("aria-busy", "true");
      setStatus("Sending your enquiry…");

      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: data,
          signal: controller.signal,
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success === false) {
          throw new Error(result.message || "Submission failed");
        }

        form.reset();
        setStatus(
          "Thank you — your enquiry has been received. We will respond within one working day."
        );
      } catch (error) {
        setStatus(
          "We couldn't send that automatically. Please call +91 97822 17339 or email " +
            FALLBACK_EMAIL + ".",
          true
        );
      } finally {
        window.clearTimeout(timer);
        if (submitBtn) submitBtn.disabled = false;
        form.removeAttribute("aria-busy");
      }
    });
  }
})();
