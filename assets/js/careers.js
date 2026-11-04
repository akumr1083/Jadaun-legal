/* =========================================================
   Jadaun Legal — careers application form
   ---------------------------------------------------------
   Validates the application, handles resume selection and
   posts to the Supabase Edge Function configured in
   careers-config.js.

   If no endpoint is configured the form does NOT fake a
   successful submission. It validates everything, then offers
   a pre-filled email so the candidate can still apply.
   ========================================================= */

(function () {
  "use strict";

  const form = document.getElementById("applicationForm");
  if (!form) return;

  const cfg = window.JADAUN_CAREERS || {};
  const clean = (value) => String(value == null ? "" : value).trim();

  const endpoint = clean(cfg.submitEndpoint);
  const anonKey = clean(cfg.supabaseAnonKey);
  const configured =
    /^https?:\/\//i.test(endpoint) && !/YOUR|PLACEHOLDER|EXAMPLE/i.test(endpoint);
  const contactEmail = clean(cfg.contactEmail) || "advabhaysingh07@gmail.com";
  const maxMB = Number(cfg.maxResumeMB) > 0 ? Number(cfg.maxResumeMB) : 5;
  const maxBytes = maxMB * 1024 * 1024;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const POSITIONS = [
    "Internship",
    "Jr. Legal Associates",
    "Filing/Appearing Counsel",
    "Clerk",
    "Administrator",
    "Steno/Typist",
  ];
  const ALLOWED_EXT = ["pdf", "doc", "docx"];
  const ERROR_IDS = {
    full_name: "fullName-error",
    email: "email-error",
    mobile: "mobile-error",
    city: "city-error",
    position: "position-error",
    qualification: "qualification-error",
    graduation_year: "graduationYear-error",
    resume: "resume-error",
    declaration: "declaration-error",
  };

  const field = (name) => form.elements.namedItem(name);
  const status = document.getElementById("applicationStatus");
  const statusText = document.getElementById("applicationStatusText");
  const statusLink = document.getElementById("applicationStatusLink");
  const copyButton = document.getElementById("applicationCopy");
  const submitButton = document.getElementById("applicationSubmit");
  const submitLabel = form.querySelector("[data-submit-label]");
  const notice = document.getElementById("applicationNotice");
  const successPanel = document.getElementById("applicationSuccess");
  const tokenInput = document.getElementById("clientToken");

  const fileInput = document.getElementById("resume");
  const drop = document.getElementById("resumeDrop");
  const fileCard = document.getElementById("resumeFile");
  const fileNameEl = document.getElementById("resumeFileName");
  const fileSizeEl = document.getElementById("resumeFileSize");
  const fileTitle = document.getElementById("resumeTitle");
  const fileHelp = document.getElementById("resume-help");
  const fileMeta = drop ? drop.querySelector(".af-upload__meta") : null;

  let selectedFile = null;
  let submitting = false;
  let lastSummary = "";

  /* ---------- validation ---------- */

  const validators = {
    full_name(value) {
      const v = clean(value);
      if (!v) return "Please enter your full name.";
      if (v.length < 2) return "Please enter your full name.";
      if (v.length > 120) return "Please keep your name under 120 characters.";
      return "";
    },
    email(value) {
      const v = clean(value);
      if (!v) return "Please enter your email address.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        return "Please enter a valid email address.";
      }
      return "";
    },
    mobile(value) {
      const digits = clean(value).replace(/\D/g, "");
      const local = digits.length > 10 ? digits.slice(-10) : digits;
      if (!/^[6-9]\d{9}$/.test(local)) {
        return "Please enter a valid 10-digit mobile number.";
      }
      return "";
    },
    city(value) {
      if (clean(value).length < 2) return "Please enter your current city.";
      return "";
    },
    position(value) {
      if (POSITIONS.indexOf(clean(value)) === -1) {
        return "Please select the position you are applying for.";
      }
      return "";
    },
    qualification(value) {
      if (clean(value).length < 2) {
        return "Please enter your highest educational qualification.";
      }
      return "";
    },
    graduation_year(value) {
      const v = clean(value);
      if (!v) return "";
      const year = Number(v);
      const maxYear = new Date().getFullYear() + 6;
      if (!Number.isInteger(year) || year < 1950 || year > maxYear) {
        return "Please enter a valid graduation year between 1950 and " + maxYear + ".";
      }
      return "";
    },
  };

  function validateFile(file) {
    if (!file) return "Please attach your resume (PDF, DOC or DOCX).";
    const extension = String(file.name || "").split(".").pop().toLowerCase();
    if (ALLOWED_EXT.indexOf(extension) === -1) {
      return "Please upload a PDF, DOC or DOCX file.";
    }
    if (file.size > maxBytes) {
      return "Your resume must be " + maxMB + " MB or smaller.";
    }
    if (file.size === 0) {
      return "That file appears to be empty. Please choose another.";
    }
    return "";
  }

  function setError(name, message) {
    const el = field(name);
    if (!el) return;

    const error = document.getElementById(ERROR_IDS[name] || name + "-error");
    const wrap = el.closest(".af-field") || el.closest(".af-check");

    if (error) {
      error.textContent = message;
      error.hidden = !message;
    }
    el.setAttribute("aria-invalid", message ? "true" : "false");

    if (wrap) wrap.classList.toggle("is-invalid", Boolean(message));
    if (name === "resume" && drop) {
      drop.classList.toggle("is-invalid", Boolean(message));
    }
  }

  function clearError(name) {
    setError(name, "");
  }

  function clearAllErrors() {
    Object.keys(ERROR_IDS).forEach(clearError);
  }

  function validateAll() {
    let firstInvalid = null;

    ["full_name", "email", "mobile", "city", "position", "qualification", "graduation_year"].forEach(
      function (name) {
        const el = field(name);
        if (!el) return;
        const message = validators[name] ? validators[name](el.value) : "";
        setError(name, message);
        if (message && !firstInvalid) firstInvalid = el;
      }
    );

    const resumeMessage = validateFile(selectedFile);
    setError("resume", resumeMessage);
    if (resumeMessage && !firstInvalid) firstInvalid = fileInput;

    const declaration = field("declaration");
    const declarationMessage =
      declaration && !declaration.checked
        ? "Please confirm the declaration before submitting."
        : "";
    setError("declaration", declarationMessage);
    if (declarationMessage && !firstInvalid) firstInvalid = declaration;

    return firstInvalid;
  }

  function focusInvalid(el) {
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch (error) {
      el.focus();
    }
    const target = el.closest(".af-field") || el.closest(".af-check") || el;
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
  }

  /* ---------- status ---------- */

  function setStatus(message, type, options) {
    if (!status) return;

    status.hidden = !message;
    status.classList.toggle("is-error", type === "error");
    status.classList.toggle("is-notice", type === "notice");
    status.classList.toggle("is-success", type === "success");

    if (statusText) statusText.textContent = message || "";

    if (statusLink) {
      if (options && options.href) {
        statusLink.href = options.href;
        statusLink.textContent = options.linkLabel || "Open email app";
        statusLink.hidden = false;
      } else {
        statusLink.hidden = true;
        statusLink.removeAttribute("href");
      }
    }

    if (copyButton) copyButton.hidden = !(options && options.copy);

    if (message) {
      status.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "nearest",
      });
    }
  }

  function setLoading(loading) {
    submitting = loading;
    if (submitButton) {
      submitButton.disabled = loading;
      submitButton.classList.toggle("is-loading", loading);
      submitButton.setAttribute("aria-busy", loading ? "true" : "false");
    }
    form.setAttribute("aria-busy", loading ? "true" : "false");
  }

  /* ---------- resume ---------- */

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function renderFile() {
    const hasFile = Boolean(selectedFile);

    if (fileCard) fileCard.hidden = !hasFile;
    if (drop) drop.classList.toggle("has-file", hasFile);

    if (hasFile) {
      if (fileNameEl) fileNameEl.textContent = selectedFile.name;
      if (fileSizeEl) {
        const extension = String(selectedFile.name).split(".").pop().toUpperCase();
        fileSizeEl.textContent = formatBytes(selectedFile.size) + " · " + extension;
      }
      if (fileTitle) fileTitle.textContent = "Click to replace your CV";
      if (fileHelp) {
        fileHelp.textContent =
          "Attached: " +
          selectedFile.name +
          " (" +
          formatBytes(selectedFile.size) +
          "). Choose another file to replace it.";
      }
    } else {
      if (fileNameEl) fileNameEl.textContent = "";
      if (fileSizeEl) fileSizeEl.textContent = "";
      if (fileTitle) {
        fileTitle.innerHTML = "Drop your CV here or <span>browse</span>";
      }
      if (fileHelp) {
        fileHelp.textContent =
          "Accepted formats: PDF, DOC or DOCX. Maximum file size: " + maxMB + " MB.";
      }
    }
  }

  function handleFile(file) {
    if (!file) {
      selectedFile = null;
      renderFile();
      return;
    }

    const message = validateFile(file);
    if (message) {
      selectedFile = null;
      if (fileInput) fileInput.value = "";
      renderFile();
      setError("resume", message);
      focusInvalid(fileInput);
      return;
    }

    selectedFile = file;
    clearError("resume");
    renderFile();
  }

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      const file = fileInput.files && fileInput.files[0];
      handleFile(file || null);
    });
  }

  if (drop) {
    ["dragenter", "dragover"].forEach(function (type) {
      drop.addEventListener(type, function (event) {
        event.preventDefault();
        event.stopPropagation();
        drop.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach(function (type) {
      drop.addEventListener(type, function (event) {
        event.preventDefault();
        event.stopPropagation();
        drop.classList.remove("is-dragover");
      });
    });

    drop.addEventListener("drop", function (event) {
      const file =
        event.dataTransfer && event.dataTransfer.files
          ? event.dataTransfer.files[0]
          : null;
      if (!file) return;

      try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        if (fileInput) fileInput.files = transfer.files;
      } catch (error) {
        /* The File is still held in `selectedFile`. */
      }

      handleFile(file);
    });
  }

  const replaceButton = document.getElementById("resumeReplace");
  if (replaceButton && fileInput) {
    replaceButton.addEventListener("click", function () {
      fileInput.click();
    });
  }

  const removeButton = document.getElementById("resumeRemove");
  if (removeButton) {
    removeButton.addEventListener("click", function () {
      selectedFile = null;
      if (fileInput) fileInput.value = "";
      renderFile();
      clearError("resume");
    });
  }

  /* ---------- email fallback ---------- */

  function getValue(name) {
    const el = field(name);
    if (!el) return "";
    if (el.type === "checkbox") return el.checked ? "Yes" : "No";
    return clean(el.value);
  }

  function buildSummary() {
    return [
      "Application for: " + getValue("position"),
      "",
      "PERSONAL INFORMATION",
      "Full name: " + getValue("full_name"),
      "Email: " + getValue("email"),
      "Mobile: " + getValue("mobile"),
      "Current city: " + getValue("city"),
      "",
      "PROFESSIONAL INFORMATION",
      "Position applied for: " + getValue("position"),
      "Highest educational qualification: " + getValue("qualification"),
      "College / university: " + (getValue("college") || "—"),
      "Year of graduation: " + (getValue("graduation_year") || "—"),
      "Total work experience: " + (getValue("experience") || "—"),
      "Current organization: " + (getValue("current_organization") || "—"),
      "",
      "ADDITIONAL INFORMATION",
      "Cover letter / brief introduction:",
      getValue("cover_letter") || "—",
      "",
      "Relevant skills and expertise:",
      getValue("skills") || "—",
      "",
      "Notice period / availability: " + (getValue("notice_period") || "—"),
      "",
      "DECLARATION",
      "I hereby declare that the information provided by me is accurate and complete to the best of my knowledge. I consent to Jadaun Legal processing my information for recruitment purposes.",
      "",
      "Resume: " + (selectedFile ? selectedFile.name : "—"),
      "",
      "Please attach your resume / CV to this email before sending.",
    ].join("\n");
  }

  function offerEmailFallback() {
    lastSummary = buildSummary();
    const subject = "Application — " + getValue("position") + " — " + getValue("full_name");
    const href =
      "mailto:" +
      encodeURIComponent(contactEmail) +
      "?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(lastSummary);

    setStatus(
      "Your application is ready to send by email. Open your email app, attach your CV, and press Send. If nothing opens, copy the details and paste them into an email to " +
        contactEmail +
        ".",
      "notice",
      { href: href, linkLabel: "Open email app", copy: true }
    );
  }

  if (copyButton) {
    copyButton.addEventListener("click", async function () {
      if (!lastSummary) return;
      const original = copyButton.textContent;

      try {
        await navigator.clipboard.writeText(lastSummary);
        copyButton.textContent = "Details copied";
      } catch (error) {
        const area = document.createElement("textarea");
        area.value = lastSummary;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        try {
          document.execCommand("copy");
          copyButton.textContent = "Details copied";
        } catch (copyError) {
          copyButton.textContent = "Copy failed — select the text manually";
        }
        document.body.removeChild(area);
      }

      window.setTimeout(function () {
        copyButton.textContent = original;
      }, 3000);
    });
  }

  /* ---------- online submission ---------- */

  function showSuccess() {
    setStatus("", null);
    form.hidden = true;
    if (successPanel) {
      successPanel.hidden = false;
      try {
        successPanel.focus({ preventScroll: true });
      } catch (error) {
        successPanel.focus();
      }
      successPanel.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
    }
    try {
      sessionStorage.setItem("jl-careers-submitted-at", String(Date.now()));
    } catch (error) {
      /* storage can be disabled */
    }
  }

  async function submitOnline() {
    setLoading(true);
    setStatus("Submitting your application…", "notice");

    const data = new FormData();
    [
      "full_name",
      "email",
      "mobile",
      "city",
      "position",
      "qualification",
      "college",
      "graduation_year",
      "experience",
      "current_organization",
      "cover_letter",
      "skills",
      "notice_period",
      "declaration",
      "client_token",
    ].forEach(function (name) {
      const el = field(name);
      if (!el) return;
      if (el.type === "checkbox") {
        if (el.checked) data.append(name, el.value || "yes");
      } else {
        data.append(name, clean(el.value));
      }
    });

    data.append("source", "careers-page");
    if (selectedFile) data.append("resume", selectedFile, selectedFile.name);

    const controller = new AbortController();
    const timer = window.setTimeout(function () {
      controller.abort();
    }, 60000);

    try {
      const headers = { Accept: "application/json" };
      if (anonKey) {
        headers.Authorization = "Bearer " + anonKey;
        headers.apikey = anonKey;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: data,
        signal: controller.signal,
      });

      const result = await response.json().catch(function () {
        return {};
      });

      if (!response.ok || result.ok === false) {
        throw new Error(result.error || "Submission failed");
      }

      showSuccess();
    } catch (error) {
      const message =
        error && error.name === "AbortError"
          ? "The submission took too long. Please check your connection and try again."
          : "We couldn't submit your application just now. Please try again in a moment, or send your details by email to " +
            contactEmail +
            ". Your form has not been cleared.";

      const subject = "Application — " + getValue("position") + " — " + getValue("full_name");
      setStatus(message, "error", {
        href:
          "mailto:" +
          encodeURIComponent(contactEmail) +
          "?subject=" +
          encodeURIComponent(subject),
        linkLabel: "Email your CV instead",
      });
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
    }
  }

  /* ---------- wiring ---------- */

  form.addEventListener("input", function (event) {
    const name = event.target && event.target.name;
    if (name && ERROR_IDS[name]) clearError(name);
  });

  form.addEventListener("change", function (event) {
    const name = event.target && event.target.name;
    if (name && ERROR_IDS[name] && name !== "resume") clearError(name);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (submitting) return;

    const honeypot = field("company_website");
    if (honeypot && clean(honeypot.value)) return;

    const firstInvalid = validateAll();
    if (firstInvalid) {
      setStatus("Please check the highlighted fields and try again.", "error");
      focusInvalid(firstInvalid);
      return;
    }

    if (!configured) {
      offerEmailFallback();
      return;
    }

    submitOnline();
  });

  document.querySelectorAll("[data-role]").forEach(function (link) {
    link.addEventListener("click", function () {
      const select = field("position");
      if (!select) return;
      select.value = link.getAttribute("data-role") || "";
      clearError("position");
      window.setTimeout(function () {
        try {
          select.focus({ preventScroll: true });
        } catch (error) {
          select.focus();
        }
      }, 550);
    });
  });

  if (successPanel) {
    const again = document.getElementById("applicationAgain");
    if (again) {
      again.addEventListener("click", function () {
        successPanel.hidden = true;
        form.hidden = false;
        form.reset();
        selectedFile = null;
        if (fileInput) fileInput.value = "";
        renderFile();
        clearAllErrors();
        setStatus("", null);
        setToken();
        form.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
        const first = field("full_name");
        if (first) {
          window.setTimeout(function () {
            try {
              first.focus({ preventScroll: true });
            } catch (error) {
              first.focus();
            }
          }, 350);
        }
      });
    }
  }

  function makeToken() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return (
      "app-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 12)
    );
  }

  function setToken() {
    if (tokenInput) tokenInput.value = makeToken();
  }

  /* ---------- initial state ---------- */

  setToken();
  renderFile();

  if (notice) notice.hidden = configured;
  if (submitLabel) {
    submitLabel.textContent = configured ? "Submit application" : "Continue by email";
  }
  if (fileHelp) {
    fileHelp.textContent =
      "Accepted formats: PDF, DOC or DOCX. Maximum file size: " + maxMB + " MB.";
  }
  if (fileMeta) {
    fileMeta.textContent = "PDF, DOC or DOCX · maximum " + maxMB + " MB";
  }

  const yearInput = field("graduation_year");
  if (yearInput) {
    yearInput.max = String(new Date().getFullYear() + 6);
  }

  if (!configured) {
    console.info(
      "[careers] No submitEndpoint is configured. The form will validate and offer a pre-filled email fallback. See README.md for the Supabase setup."
    );
  }
})();
