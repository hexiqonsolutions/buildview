import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for Gmail"
    );
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${appUrl}/api/gmail/callback`
  );
}

export function getGmailAuthUrl(state: string) {
  const client = getGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export function getGmailClient(accessToken: string, refreshToken?: string) {
  const auth = getGoogleOAuthClient();
  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.gmail({ version: "v1", auth });
}

export type ComposeAttachment = {
  filename: string;
  mimeType: string;
  contentBase64: string;
};

export function buildRawEmail(options: {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: ComposeAttachment[];
}) {
  const boundary = `bv_${Date.now()}`;
  const headers = [
    `From: ${options.from}`,
    `To: ${options.to.join(", ")}`,
    options.cc?.length ? `Cc: ${options.cc.join(", ")}` : null,
    options.bcc?.length ? `Bcc: ${options.bcc.join(", ")}` : null,
    `Subject: ${options.subject}`,
    "MIME-Version: 1.0",
    options.inReplyTo ? `In-Reply-To: ${options.inReplyTo}` : null,
    options.references ? `References: ${options.references}` : null,
  ].filter(Boolean);

  let body: string;

  if (options.attachments?.length) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    const parts = [
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: 7bit",
      "",
      options.html,
      "",
    ];

    for (const file of options.attachments) {
      parts.push(
        `--${boundary}`,
        `Content-Type: ${file.mimeType}; name="${file.filename}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${file.filename}"`,
        "",
        file.contentBase64,
        ""
      );
    }
    parts.push(`--${boundary}--`);
    body = parts.join("\r\n");
  } else {
    headers.push('Content-Type: text/html; charset="UTF-8"');
    body = `\r\n${options.html}`;
  }

  const raw = `${headers.join("\r\n")}\r\n${body}`;
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function applyPersonalization(
  template: string,
  vars: { Name?: string; Company?: string; Project?: string }
) {
  return template
    .replaceAll("{{Name}}", vars.Name ?? "")
    .replaceAll("{{Company}}", vars.Company ?? "")
    .replaceAll("{{Project}}", vars.Project ?? "");
}
