// Run with:
//   deno test --allow-env supabase/functions/submit-application/index_test.ts
//
// These tests exercise the notification payload without sending real mail:
// global fetch is replaced with a recorder, and a minimal fake Supabase
// client returns a signed URL. The important assertion is that the bytes
// Base64-encoded for Resend decode back to the exact uploaded file.

import { notifyFirm, type ApplicationSummary } from "./email.ts";

const PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3,
  0xcf, 0xd3, 0x0a, 0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a,
]);
const DOC_BYTES = new Uint8Array([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x01, 0x02, 0x03,
]);
const DOCX_BYTES = new Uint8Array([
  0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x21, 0x00,
]);

const SUMMARY: ApplicationSummary = {
  id: "7f1d4f0e-6a2b-4c3d-9e8f-1a2b3c4d5e6f",
  createdAt: "2026-11-05T10:00:00.000Z",
  fullName: "Test Candidate",
  email: "candidate@example.com",
  mobile: "9876543210",
  city: "New Delhi",
  position: "Jr. Legal Associates",
  qualification: "BA LLB (Hons.)",
  college: "Campus Law Centre, DU",
  graduationYear: "2024",
  experience: "1–3 years",
  currentOrganization: "Chambers of A. Singh",
  coverLetter: "I would like to join the firm.",
  skills: "Legal research, drafting",
  noticePeriod: "30 days",
  resumeName: "Test-Candidate-CV.pdf",
  resumePath: "2026/11/7f1d4f0e-Test-Candidate-CV.pdf",
  resumeType: "application/pdf",
  resumeSize: PDF_BYTES.byteLength,
  resumeBytes: PDF_BYTES,
};

type Captured = {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
};

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function fakeSupabase(): Parameters<typeof notifyFirm>[0] {
  return {
    storage: {
      from() {
        return {
          createSignedUrl: () =>
            Promise.resolve({
              data: {
                signedUrl:
                  "https://project.supabase.co/storage/v1/object/sign/resumes/test?token=abc",
              },
              error: null,
            }),
        };
      },
    },
  } as unknown as Parameters<typeof notifyFirm>[0];
}

function captureFetch(statuses: number[]): Captured[] {
  const calls: Captured[] = [];
  const original = globalThis.fetch;

  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    calls.push({
      url: String(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body,
    });
    const status = statuses[calls.length - 1] ?? 200;
    return Promise.resolve(
      new Response(JSON.stringify({ id: `email_${calls.length}` }), {
        status,
        headers: { "Content-Type": "application/json" },
      })
    );
  }) as typeof fetch;

  return calls;
}

function restoreFetch(): void {
  // captureFetch replaces the global; tests run sequentially and each
  // test restores the original before the next one installs its own.
  globalThis.fetch = ORIGINAL_FETCH;
}

const ORIGINAL_FETCH = globalThis.fetch;

function installEnv(): void {
  Deno.env.set("RESEND_API_KEY", "re_test_key");
  Deno.env.set("CAREERS_NOTIFY_EMAIL", "advabhaysingh07@gmail.com");
}

Deno.test("attaches the exact PDF, DOC and DOCX bytes with the right MIME type", async () => {
  installEnv();

  const cases = [
    { name: "Test-Candidate-CV.pdf", type: "application/pdf", bytes: PDF_BYTES },
    { name: "Test-Candidate-CV.doc", type: "application/msword", bytes: DOC_BYTES },
    {
      name: "Test-Candidate-CV.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes: DOCX_BYTES,
    },
  ];

  for (const testCase of cases) {
    const calls = captureFetch([200]);
    try {
      const summary: ApplicationSummary = {
        ...SUMMARY,
        resumeName: testCase.name,
        resumeType: testCase.type,
        resumeSize: testCase.bytes.byteLength,
        resumeBytes: testCase.bytes,
      };

      await notifyFirm(fakeSupabase(), summary);

      assertEqual(calls.length, 1, `${testCase.type}: one email`);
      assertEqual(calls[0].url, "https://api.resend.com/emails", "Resend endpoint");

      const attachments = calls[0].body.attachments as Array<Record<string, string>>;
      assert(Array.isArray(attachments) && attachments.length === 1, "one attachment");
      assertEqual(attachments[0].filename, testCase.name, "attachment filename");
      assertEqual(attachments[0].content_type, testCase.type, "attachment content type");

      const decoded = Uint8Array.from(atob(attachments[0].content), (character) =>
        character.charCodeAt(0)
      );
      assertEqual(decoded.length, testCase.bytes.length, "decoded length");
      assert(
        decoded.every((byte, index) => byte === testCase.bytes[index]),
        `${testCase.type}: attachment bytes must match the uploaded file`
      );

      assertEqual(
        calls[0].headers["Idempotency-Key"],
        SUMMARY.id,
        "idempotency key prevents duplicate email"
      );
      assert(
        String(calls[0].body.html).includes("resume is attached to this email"),
        "email body mentions the attachment"
      );
    } finally {
      restoreFetch();
    }
  }
});

Deno.test("email body carries every application detail", async () => {
  installEnv();
  const calls = captureFetch([200]);
  try {
    await notifyFirm(fakeSupabase(), SUMMARY);
    const html = String(calls[0].body.html);
    const text = String(calls[0].body.text);

    for (const value of [
      SUMMARY.fullName,
      SUMMARY.email,
      SUMMARY.mobile,
      SUMMARY.position,
      SUMMARY.qualification,
      SUMMARY.experience,
      SUMMARY.city,
      SUMMARY.noticePeriod,
      SUMMARY.resumeName,
    ]) {
      assert(html.includes(value), `html should include ${value}`);
      assert(text.includes(value), `text should include ${value}`);
    }

    assertEqual(calls[0].body.subject, `New application — ${SUMMARY.position} — ${SUMMARY.fullName}`, "subject");
    assertEqual(calls[0].body.reply_to, SUMMARY.email, "reply-to is the candidate");
  } finally {
    restoreFetch();
  }
});

Deno.test("falls back to a private link when Resend rejects the attachment", async () => {
  installEnv();
  const calls = captureFetch([422, 200]);
  try {
    await notifyFirm(fakeSupabase(), SUMMARY);

    assertEqual(calls.length, 2, "one retry");
    assert("attachments" in calls[0].body, "first attempt includes the file");
    assert(!("attachments" in calls[1].body), "retry omits the file");
    assertEqual(
      calls[1].headers["Idempotency-Key"],
      `${SUMMARY.id}-link`,
      "retry uses its own idempotency key"
    );
    assert(
      String(calls[1].body.html).includes("could not be attached"),
      "retry explains the link fallback"
    );
    assert(
      String(calls[1].body.html).includes("Download resume"),
      "retry includes the signed download link"
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("does not retry when Resend returns a server error", async () => {
  installEnv();
  const calls = captureFetch([500]);
  try {
    await notifyFirm(fakeSupabase(), SUMMARY);
    assertEqual(calls.length, 1, "no duplicate attempt on 500");
  } finally {
    restoreFetch();
  }
});
