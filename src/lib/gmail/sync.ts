import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";
import {
  getGmailClient,
  getGoogleOAuthClient,
  htmlToText,
} from "@/lib/gmail/client";

export async function getActiveEmailAccount(
  organizationId: string,
  userId: string
) {
  return prisma.emailAccount.findFirst({
    where: {
      organizationId,
      userId,
      deletedAt: null,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAuthorizedGmail(accountId: string) {
  const account = await prisma.emailAccount.findFirst({
    where: { id: accountId, deletedAt: null, isActive: true },
  });
  if (!account?.accessTokenEnc) {
    throw new Error("Gmail account is not connected");
  }

  let accessToken = decryptSecret(account.accessTokenEnc);
  const refreshToken = account.refreshTokenEnc
    ? decryptSecret(account.refreshTokenEnc)
    : undefined;

  const expiresSoon =
    account.tokenExpiresAt &&
    account.tokenExpiresAt.getTime() < Date.now() + 60_000;

  if (expiresSoon && refreshToken) {
    const oauth = getGoogleOAuthClient();
    oauth.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth.refreshAccessToken();
    accessToken = credentials.access_token || accessToken;

    await prisma.emailAccount.update({
      where: { id: account.id },
      data: {
        accessTokenEnc: encryptSecret(accessToken),
        tokenExpiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : account.tokenExpiresAt,
      },
    });
  }

  return {
    account,
    gmail: getGmailClient(accessToken, refreshToken),
  };
}

function headerValue(
  headers: { name?: string | null; value?: string | null }[] | undefined,
  name: string
) {
  return (
    headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ||
    ""
  );
}

function parseAddressList(value: string) {
  if (!value.trim()) return [] as string[];
  return value
    .split(",")
    .map((part) => {
      const match = part.match(/<([^>]+)>/);
      return (match?.[1] || part).trim();
    })
    .filter(Boolean);
}

function decodeBody(payload: {
  body?: { data?: string | null } | null;
  parts?: unknown[] | null;
  mimeType?: string | null;
}): { html?: string; text?: string } {
  const result: { html?: string; text?: string } = {};

  const walk = (part: {
    body?: { data?: string | null } | null;
    parts?: unknown[] | null;
    mimeType?: string | null;
  }) => {
    if (part.body?.data) {
      const decoded = Buffer.from(part.body.data, "base64url").toString("utf8");
      if (part.mimeType === "text/html") result.html = decoded;
      if (part.mimeType === "text/plain") result.text = decoded;
    }
    if (Array.isArray(part.parts)) {
      for (const child of part.parts) {
        walk(child as typeof part);
      }
    }
  };

  walk(payload);
  return result;
}

export async function syncGmailInbox(accountId: string, maxResults = 30) {
  const { account, gmail } = await getAuthorizedGmail(accountId);

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "in:inbox OR in:sent newer_than:30d",
  });

  const messages = list.data.messages ?? [];
  let synced = 0;

  for (const item of messages) {
    if (!item.id) continue;

    const existing = await prisma.emailMessage.findFirst({
      where: {
        emailAccountId: account.id,
        gmailMessageId: item.id,
        deletedAt: null,
      },
    });
    if (existing) continue;

    const full = await gmail.users.messages.get({
      userId: "me",
      id: item.id,
      format: "full",
    });

    const headers = full.data.payload?.headers ?? [];
    const from = headerValue(headers, "From");
    const to = parseAddressList(headerValue(headers, "To"));
    const cc = parseAddressList(headerValue(headers, "Cc"));
    const subject = headerValue(headers, "Subject") || "(no subject)";
    const body = decodeBody(full.data.payload || {});
    const internalDate = full.data.internalDate
      ? new Date(Number(full.data.internalDate))
      : new Date();

    const fromEmail =
      parseAddressList(from)[0] || from || account.email;
    const isOutbound =
      fromEmail.toLowerCase() === account.email.toLowerCase();

    let threadId: string | undefined;
    if (full.data.threadId) {
      const thread = await prisma.emailThread.upsert({
        where: {
          emailAccountId_gmailThreadId: {
            emailAccountId: account.id,
            gmailThreadId: full.data.threadId,
          },
        },
        update: {
          subject,
          snippet: full.data.snippet || null,
          lastMessageAt: internalDate,
          deletedAt: null,
        },
        create: {
          organizationId: account.organizationId,
          emailAccountId: account.id,
          gmailThreadId: full.data.threadId,
          subject,
          snippet: full.data.snippet || null,
          lastMessageAt: internalDate,
        },
      });
      threadId = thread.id;
    }

    await prisma.emailMessage.create({
      data: {
        organizationId: account.organizationId,
        emailAccountId: account.id,
        threadId,
        gmailMessageId: item.id,
        direction: isOutbound ? "OUTBOUND" : "INBOUND",
        status: isOutbound ? "SENT" : "INBOX",
        fromAddress: fromEmail,
        toAddresses: to.length ? to : [account.email],
        ccAddresses: cc,
        subject,
        bodyHtml: body.html || null,
        bodyText: body.text || (body.html ? htmlToText(body.html) : null),
        sentAt: isOutbound ? internalDate : null,
        createdAt: internalDate,
      },
    });

    synced += 1;
  }

  await prisma.emailAccount.update({
    where: { id: account.id },
    data: {
      lastSyncedAt: new Date(),
      syncCursor: list.data.resultSizeEstimate?.toString() ?? null,
    },
  });

  return { synced, scanned: messages.length };
}
