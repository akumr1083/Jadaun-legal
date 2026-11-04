// =========================================================
// Jadaun Legal — submit-application Edge Function
// ---------------------------------------------------------
// Deploy with:
//   supabase functions deploy submit-application --no-verify-jwt
//
// Required secrets (Project → Edge Functions → Secrets):
//   RESEND_API_KEY          Resend API key (optional; without it the
//                           application is still stored, just no email)
//   CAREERS_NOTIFY_EMAIL    e.g. advabhaysingh07@gmail.com
//   CAREERS_FROM_EMAIL      e.g. "Jadaun Legal Careers <careers@yourdomain.com>"
//   RESUME_BUCKET           optional, defaults to "resumes"
//   ALLOWED_ORIGIN          optional, defaults to "*"
//   RATE_LIMIT_SALT         optional, used to hash visitor IPs
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// =========================================================

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const POSITIONS = new Set([
  "Internship",
  "Jr. Legal Associates",
  "Filing/Appearing Counsel",
  "Clerk",
  "Administrator",
  "Steno/Typist",
]);

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PER_IP_PER_10_MIN = 5;
const BUCKET = Deno.env.get("RESUME_BUCKET") || "resumes";

const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function text(value: FormDataEntryValue | null, max = 5000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

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

function mimeForExtension(extension: string): string {
  if (extension === "pdf") return "application/pdf";
  if (extension === "doc") return "application/msword";
  return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function hasMagic(head: Uint8Array, signature: number[]): boolean {
  if (head.length < signature.length) return false;
  return signature.every((byte, index) => head[index] === byte);
}

async function hashIp(ip: string): Promise<string> {
  const salt = Deno.env.get("RATE_LIMIT_SALT") || "jadaun-legal-careers";
  const bytes = new TextEncoder().encode(`${ip}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    return json({ ok: false, error: "The application service is not configured." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    return json({ ok: false, error: "Invalid form submission." }, 400);
  }

  // Honeypot: a real candidate never sees or fills this field.
  if (text(form.get("company_website"), 200)) {
    return json({ ok: false, error: "Invalid submission." }, 400);
  }

  const fullName = text(form.get("full_name"), 120);
  const email = text(form.get("email"), 200).toLowerCase();
  const mobile = text(form.get("mobile"), 40);
  const city = text(form.get("city"), 120);
  const position = text(form.get("position"), 80);
  const qualification = text(form.get("qualification"), 200);
  const college = text(form.get("college"), 200);
  const graduationYear = text(form.get("graduation_year"), 10);
  const experience = text(form.get("experience"), 80);
  const currentOrganization = text(form.get("current_organization"), 200);
  const coverLetter = text(form.get("cover_letter"), 3000);
  const skills = text(form.get("skills"), 1500);
  const noticePeriod = text(form.get("notice_period"), 120);
  const declaration = text(form.get("declaration"), 10).toLowerCase();
  const clientToken = text(form.get("client_token"), 100) || crypto.randomUUID();
  const source = text(form.get("source"), 80) || "careers-page";

  if (!fullName || fullName.length < 2) {
    return json({ ok: false, error: "Please provide your full name." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ ok: false, error: "Please provide a valid email address." }, 400);
  }

  const digits = mobile.replace(/\D/g, "");
  const localMobile = digits.length > 10 ? digits.slice(-10) : digits;
  if (!/^[6-9]\d{9}$/.test(localMobile)) {
    return json({ ok: false, error: "Please provide a valid 10-digit mobile number." }, 400);
  }
  if (!city || city.length < 2) {
    return json({ ok: false, error: "Please provide your current city." }, 400);
  }
  if (!POSITIONS.has(position)) {
    return json({ ok: false, error: "Please select a valid position." }, 400);
  }
  if (!qualification || qualification.length < 2) {
    return json({ ok: false, error: "Please provide your highest qualification." }, 400);
  }
  if (!["yes", "on", "true"].includes(declaration)) {
    return json({ ok: false, error: "The declaration must be accepted." }, 400);
  }

  if (graduationYear) {
    const year = Number(graduationYear);
    if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 6) {
      return json({ ok: false, error: "Please provide a valid graduation year." }, 400);
    }
  }

  const resume = form.get("resume");
  if (!(resume instanceof File) || resume.size === 0) {
    return json({ ok: false, error: "Please attach your resume." }, 400);
  }
  if (resume.size > MAX_BYTES) {
    return json({ ok: false, error: "Your resume must be 5 MB or smaller." }, 400);
  }

  const extension = (resume.name.split(".").pop() || "").toLowerCase();
  if (!["pdf", "doc", "docx"].includes(extension)) {
    return json({ ok: false, error: "Please upload a PDF, DOC or DOCX file." }, 400);
  }

  const head = new Uint8Array(await resume.slice(0, 8).arrayBuffer());
  const magicOk =
    (extension === "pdf" && hasMagic(head, [0x25, 0x50, 0x44, 0x46])) ||
    (extension === "docx" && hasMagic(head, [0x50, 0x4b, 0x03, 0x04])) ||
    (extension === "doc" &&
      hasMagic(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));

  if (!magicOk) {
    return json(
      { ok: false, error: "The file does not look like a valid PDF, DOC or DOCX document." },
      400
    );
  }

  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip =
    forwarded.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ipHash = await hashIp(ip);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from("job_applications")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", tenMinutesAgo);

  if (!countError && (count ?? 0) >= MAX_PER_IP_PER_10_MIN) {
    return json(
      {
        ok: false,
        error: "Too many applications from this connection. Please try again later.",
      },
      429
    );
  }

  const applicationId = crypto.randomUUID();
  const safeName = resume.name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || `resume.${extension}`;
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const path = `${now.getUTCFullYear()}/${month}/${applicationId}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, resume, {
      contentType: mimeForExtension(extension),
      upsert: false,
    });

  if (uploadError) {
    console.error("Resume upload failed", uploadError);
    return json(
      { ok: false, error: "We couldn't store your resume. Please try again." },
      500
    );
  }

  const { data, error: insertError } = await supabase
    .from("job_applications")
    .insert({
      client_token: clientToken,
      full_name: fullName,
      email,
      mobile: localMobile,
      city,
      position,
      qualification,
      college: college || null,
      graduation_year: graduationYear || null,
      experience: experience || null,
      current_organization: currentOrganization || null,
      cover_letter: coverLetter || null,
      skills: skills || null,
      notice_period: noticePeriod || null,
      resume_path: path,
      resume_name: resume.name.slice(0, 255),
      resume_type: mimeForExtension(extension),
      resume_size: resume.size,
      source,
      ip_hash: ipHash,
      user_agent: (request.headers.get("user-agent") || "").slice(0, 500),
    })
    .select("id, created_at")
    .single();

  if (insertError) {
    try {
      await supabase.storage.from(BUCKET).remove([path]);
    } catch (cleanupError) {
      console.error("Could not remove orphaned resume", cleanupError);
    }

    if (insertError.code === "23505") {
      return json({ ok: true, duplicate: true });
    }

    console.error("Application insert failed", insertError);
    return json(
      { ok: false, error: "We couldn't save your application. Please try again." },
      500
    );
  }

  // Email notification is best-effort: the application is already stored.
  try {
    await notifyFirm(supabase, {
      id: data.id,
      createdAt: data.created_at,
      fullName,
      email,
      mobile: localMobile,
      city,
      position,
      qualification,
      college,
      graduationYear,
      experience,
      currentOrganization,
      coverLetter,
      skills,
      noticePeriod,
      resumeName: resume.name,
      resumePath: path,
    });
  } catch (notificationError) {
    console.error("Notification failed", notificationError);
  }

  return json({ ok: true, id: data.id });
});

type ApplicationSummary = {
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
};

async function notifyFirm(
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

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(application.resumePath, 60 * 60 * 24 * 7);

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
    ["Resume", application.resumeName],
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

  const html = `
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
      ${
        signed && signed.signedUrl
          ? `<p style="margin:0 0 22px;"><a href="${escapeHtml(
              signed.signedUrl
            )}" style="display:inline-block;padding:11px 20px;border-radius:999px;background:#302820;color:#faf7f0;text-decoration:none;">Download resume</a><br><span style="font-size:12px;color:#75685a;">This private link expires in 7 days.</span></p>`
          : `<p style="color:#75685a;">Open the private <strong>resumes</strong> bucket in Supabase Storage to download the CV.</p>`
      }
      <p style="margin:22px 0 0;padding-top:16px;border-top:1px solid #d8cbb8;font-size:12px;color:#75685a;">
        Review and update the application in Supabase → Table Editor → job_applications.
      </p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `New application — ${application.position} — ${application.fullName}`,
      html,
      reply_to: application.email,
    }),
  });

  if (!response.ok) {
    console.error("Resend error", response.status, await response.text());
  }
}
