/* =========================================================
   Jadaun Legal — hero flag
   Cuts the tricolour out of the Supreme Court artwork and
   redraws it as vertical strips so the cloth ripples while the
   pole, wall and building stay perfectly still.
   ========================================================= */

(function () {
  "use strict";

  const art = document.querySelector(".hero__art");
  const img = document.querySelector(".hero__art-img");
  const canvas = document.querySelector(".hero__flag");

  if (!art || !img || !canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Cloth bounds in the hero artwork (1325 x 1187). */
  const FLAG = { x: 684, y: 395, w: 90, h: 87 };

  /* Extra canvas around the cloth so the ripple never clips. */
  const PAD = 12;

  /* Cloth outline in sprite coordinates, following the wavy edges. */
  const CLOTH = [
    [1, 2],
    [22, 8],
    [44, 15],
    [66, 23],
    [89, 30],
    [90, 42],
    [90, 55],
    [90, 68],
    [89, 86],
    [66, 83],
    [44, 81],
    [22, 78],
    [1, 75],
  ];

  let sprite = null;
  let width = 0;
  let height = 0;
  let scale = 1;
  let dpr = 1;
  let lastW = 0;
  let lastH = 0;
  let running = false;
  let visible = true;
  let frameId = 0;

  const started = performance.now();

  function objectPosition() {
    const value = window.getComputedStyle(img).objectPosition || "50% 50%";
    const parts = value.split(/\s+/).map((part) => parseFloat(part) / 100);
    return {
      x: Number.isFinite(parts[0]) ? parts[0] : 0.5,
      y: Number.isFinite(parts[1]) ? parts[1] : 0.5,
    };
  }

  function buildSprite() {
    const s = document.createElement("canvas");
    s.width = FLAG.w * 2;
    s.height = FLAG.h * 2;

    const c = s.getContext("2d");
    if (!c) return;

    c.drawImage(
      img,
      FLAG.x,
      FLAG.y,
      FLAG.w,
      FLAG.h,
      0,
      0,
      FLAG.w * 2,
      FLAG.h * 2
    );

    c.globalCompositeOperation = "destination-in";
    c.beginPath();
    CLOTH.forEach(([x, y], i) => {
      if (i) c.lineTo(x * 2, y * 2);
      else c.moveTo(x * 2, y * 2);
    });
    c.closePath();
    c.fill();

    sprite = s;
  }

  function layout() {
    const rect = art.getBoundingClientRect();
    if (!rect.width || !rect.height || !img.naturalWidth) return;

    lastW = rect.width;
    lastH = rect.height;

    const pos = objectPosition();
    scale = Math.max(
      rect.width / img.naturalWidth,
      rect.height / img.naturalHeight
    );
    const renderedWidth = img.naturalWidth * scale;
    const renderedHeight = img.naturalHeight * scale;
    const offsetX = (rect.width - renderedWidth) * pos.x;
    const offsetY = (rect.height - renderedHeight) * pos.y;

    width = (FLAG.w + PAD * 2) * scale;
    height = (FLAG.h + PAD * 2) * scale;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.style.left = (offsetX + (FLAG.x - PAD) * scale).toFixed(2) + "px";
    canvas.style.top = (offsetY + (FLAG.y - PAD) * scale).toFixed(2) + "px";
    canvas.style.width = width.toFixed(2) + "px";
    canvas.style.height = height.toFixed(2) + "px";
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.opacity = "1";
  }

  function draw(time) {
    if (!width || !height || !sprite) return;

    /* Keep the overlay glued to the photo if the hero resizes without
       a ResizeObserver callback (background tabs, font swaps, etc.). */
    const rect = art.getBoundingClientRect();
    if (rect.width !== lastW || rect.height !== lastH) {
      layout();
      if (!width || !height) return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = PAD * scale;
    const clothW = FLAG.w * scale;
    const clothH = FLAG.h * scale;
    const amp = Math.max(1, clothH * 0.115);
    const cols = Math.max(36, Math.round(clothW));
    const colWidth = clothW / cols;
    const srcWidth = (FLAG.w * 2) / cols;

    /* Slice the cloth into columns and offset each one vertically. Two
       sine terms keep the flutter from reading as a mechanical bob. */
    for (let i = 0; i < cols; i += 1) {
      const u = i / (cols - 1);
      const wave =
        Math.sin(time * 2.1 + u * 6.4) * 0.72 +
        Math.sin(time * 3.4 + u * 3.2 + 1.3) * 0.28;
      const dy = wave * amp * (0.02 + 0.98 * u);

      ctx.drawImage(
        sprite,
        i * srcWidth,
        0,
        srcWidth + 1.2,
        FLAG.h * 2,
        pad + i * colWidth,
        pad + dy,
        colWidth + 0.7,
        clothH
      );
    }

    /* Fold shading keeps the ripple readable at small sizes. */
    ctx.globalCompositeOperation = "source-atop";
    for (let i = 0; i < cols; i += 1) {
      const u = i / (cols - 1);
      const shade =
        Math.sin(time * 2.1 + u * 6.4 - 0.9) * 0.7 +
        Math.sin(time * 3.4 + u * 3.2 + 0.4) * 0.3;
      const alpha = Math.abs(shade) * 0.18;

      ctx.fillStyle =
        shade > 0
          ? "rgba(255, 244, 214, " + alpha.toFixed(3) + ")"
          : "rgba(30, 18, 2, " + alpha.toFixed(3) + ")";
      ctx.fillRect(pad + i * colWidth, 0, colWidth + 1, height);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now) {
    draw((now - started) / 1000);
    if (running) frameId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (reduceMotion || running) return;
    running = true;
    frameId = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    window.cancelAnimationFrame(frameId);
  }

  function init() {
    if (!img.naturalWidth) return;
    buildSprite();
    layout();
    draw(0);
    if (visible) start();
  }

  if (img.complete) init();
  else img.addEventListener("load", init, { once: true });

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      layout();
      if (reduceMotion) draw(0);
    }).observe(art);
  }

  window.addEventListener("resize", () => {
    layout();
    if (reduceMotion) draw(0);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      layout();
      if (reduceMotion) draw(0);
    });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0 }
    ).observe(art);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (visible) start();
  });
})();
