// =========================================================
// Jadaun Legal — careers notification email
// ---------------------------------------------------------
// Builds and sends the recruitment email through Resend. The
// candidate's CV is attached as the original PDF, DOC or DOCX
// file (Base64), with a seven-day signed link as a fallback.
//
// Kept separate from index.ts so the attachment payload can be
// tested without starting the HTTP server:
//   deno test --allow-env supabase/functions/submit-application/index_test.ts
// =========================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = Deno.env.get("RESUME_BUCKET") || "resumes";

// Resend accepts up to 40 MB per email after Base64 encoding. The CV cap is
// 5 MB, so every valid application is attached; this guard only protects the
// function if the limit is raised later.
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export type ApplicationSummary = {
  id: string;
  createdAt: string;
  fullName: string;
  email: string;
  mobile: string;
  city: string;
  position: string;
  qualification: string;
  college: string;
  graduationYear: string;
  experience: string;
  currentOrganization: string;
  coverLetter: string;
  skills: string;
  noticePeriod: string;
  resumeName: string;
  resumePath: string;
  resumeType: string;
  resumeSize: number;
  resumeBytes: Uint8Array;
};

type AttachmentMode = "attached" | "link";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[character] || character;
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Base64 for the Resend attachment payload. Chunked so a 5 MB CV does not
// overflow the argument list of String.fromCharCode.
function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export async function notifyFirm(
  supabase: SupabaseClient,
  application: ApplicationSummary
): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("CAREERS_NOTIFY_EMAIL");

  if (!apiKey || !to) {
    console.info(
      "RESEND_API_KEY or CAREERS_NOTIFY_EMAIL is not set — application stored without email notification."
    );
    return;
  }

  const from =
    Deno.env.get("CAREERS_FROM_EMAIL") ||
    "Jadaun Legal Careers <onboarding@resend.dev>";

  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(application.resumePath, 60 * 60 * 24 * 7);

  if (signedError) {
    console.error("Could not create resume download link", signedError);
  }

  const resumeUrl = signed?.signedUrl || "";
  const resumeLabel = `${application.resumeName} (${formatBytes(
    application.resumeSize
  )} · ${application.resumeType})`;

  const canAttach =
    application.resumeBytes.byteLength > 0 &&
    application.resumeBytes.byteLength <= MAX_ATTACHMENT_BYTES;

  const attachment = canAttach
    ? {
        filename: application.resumeName,
        content: encodeBase64(application.resumeBytes),
        content_type: application.resumeType,
      }
    : null;

  const rows: Array<[string, string]> = [
    ["Position", application.position],
    ["Full name", application.fullName],
    ["Email", application.email],
    ["Mobile", application.mobile],
    ["Current city", application.city],
    ["Highest qualification", application.qualification],
    ["College / university", application.college || "—"],
    ["Year of graduation", application.graduationYear || "—"],
    ["Work experience", application.experience || "—"],
    ["Current organization", application.currentOrganization || "—"],
    ["Notice period / availability", application.noticePeriod || "—"],
    ["Resume", resumeLabel],
    ["Application ID", application.id],
    ["Received", application.createdAt],
  ];

  const details = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#75685a;vertical-align:top;">${escapeHtml(
          label
        )}</td><td style="padding:6px 0;color:#302820;">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  const buildHtml = (mode: AttachmentMode) => `
    <div style="font-family:Inter,Arial,sans-serif;color:#302820;line-height:1.6;max-width:720px;">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#b08d57;">Jadaun Legal · Careers</p>
      <h1 style="margin:0 0 4px;font-size:24px;font-weight:500;">New application — ${escapeHtml(
        application.position
      )}</h1>
      <p style="margin:0 0 22px;color:#75685a;">${escapeHtml(
        application.fullName
      )} applied through the website.</p>
      <table style="border-collapse:collapse;font-size:14px;">${details}</table>
      <h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;">Cover letter / introduction</h2>
      <p style="margin:0 0 18px;white-space:pre-wrap;color:#5b4f43;">${escapeHtml(
        application.coverLetter || "—"
      )}</p>
      <h2 style="margin:0 0 8px;font-size:16px;font-weight:600;">Skills and expertise</h2>
      <p style="margin:0 0 22px;white-space:pre-wrap;color:#5b4f43;">${escapeHtml(
        application.skills || "—"
      )}</p>
      <h2 style="margin:0 0 8px;font-size:16px;font-weight:600;">Resume / CV</h2>
      <p style="margin:0 0 10px;color:#5b4f43;">${escapeHtml(resumeLabel)}</p>
      ${
        mode === "attached"
          ? `<p style="margin:0 0 14px;color:#302820;"><strong>The candidate's resume is attached to this email.</strong> Download the attachment to open the original PDF, DOC or DOCX file.</p>`
          : `<p style="margin:0 0 14px;color:#302820;"><strong>The resume could not be attached to this email.</strong> Download the original file with the private link below. The link expires in 7 days.</p>`
      }
      ${
        resumeUrl
          ? `<p style="margin:0 0 22px;"><a href="${escapeHtml(
              resumeUrl
            )}" style="display:inline-block;padding:11px 20px;border-radius:999px;background:#302820;color:#faf7f0;text-decoration:none;">Download resume</a><br><span style="font-size:12px;color:#75685a;">${
              mode === "attached"
                ? "Backup private link, expires in 7 days."
                : "Private link, expires in 7 days."
            }</span></p>`
          : `<p style="margin:0 0 22px;color:#75685a;">Open the private <strong>resumes</strong> bucket in Supabase Storage to download the CV.</p>`
      }
      <p style="margin:22px 0 0;padding-top:16px;border-top:1px solid #d8cbb8;font-size:12px;color:#75685a;">
        Review and update the application in Supabase → Table Editor → job_applications.
      </p>
    </div>
  `;

  const buildText = (mode: AttachmentMode) =>
    [
      `New application — ${application.position}`,
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      "Cover letter / introduction:",
      application.coverLetter || "—",
      "",
      "Skills and expertise:",
      application.skills || "—",
      "",
      mode === "attached"
        ? "The candidate's resume is attached to this email."
        : "The resume could not be attached. Download it with the private link below.",
      resumeUrl ? `Resume link (expires in 7 days): ${resumeUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");

  const buildPayload = (mode: AttachmentMode) => ({
    from,
    to: [to],
    subject: `New application — ${application.position} — ${application.fullName}`,
    html: buildHtml(mode),
    text: buildText(mode),
    reply_to: application.email,
    ...(mode === "attached" && attachment ? { attachments: [attachment] } : {}),
  });

  const send = (mode: AttachmentMode, idempotencyKey: string) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(buildPayload(mode)),
    });

  let mode: AttachmentMode = attachment ? "attached" : "link";
  let response = await send(mode, application.id);

  if (!response.ok && mode === "attached") {
    const status = response.status;
    const body = await response.text();
    console.error("Resend rejected the resume attachment", status, body);

    // 400/413/422 mean the attachment payload was refused. Retry once
    // without it so the firm still receives the details and a private link.
    if (status === 400 || status === 413 || status === 422) {
      mode = "link";
      response = await send(mode, `${application.id}-link`);
    } else {
      return;
    }
  }

  if (!response.ok) {
    console.error("Resend error", response.status, await response.text());
    return;
  }

  console.info(
    `Notification sent for application ${application.id} (${mode}${
      mode === "attached" ? `, ${formatBytes(application.resumeSize)} attached` : ""
    }).`
  );
}
