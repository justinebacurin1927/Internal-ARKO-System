import { prisma } from "@/lib/prisma";
import { sendMail, mentionEmail } from "@/lib/email";

// Matches @handle tokens: letters, digits, dot, underscore, hyphen.
const MENTION_RE = /@([a-zA-Z0-9._-]+)/g;

/** Extract unique, lowercased @handle tokens from a comment body. */
export function parseMentions(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(MENTION_RE)) {
    found.add(m[1].toLowerCase());
  }
  return [...found];
}

/** Candidate handles a user can be mentioned by (first name, slug, email local). */
function handlesFor(user: { name: string; email: string }): string[] {
  const lower = user.name.toLowerCase();
  return [
    lower.split(/\s+/)[0], // first name
    lower.replace(/\s+/g, "."), // first.last
    lower.replace(/\s+/g, ""), // firstlast
    user.email.split("@")[0].toLowerCase(), // email local-part
  ];
}

/**
 * Resolve @mentions in a comment to users, create in-app notifications, and
 * send email. The mention author is never notified about their own mention.
 */
export async function notifyMentions(opts: {
  body: string;
  commentId: string;
  authorId: string;
  authorName: string;
  contextLabel: string;
  url: string;
}) {
  const tokens = parseMentions(opts.body);
  if (tokens.length === 0) return;

  const users = await prisma.user.findMany();
  const tokenSet = new Set(tokens);

  const matched = users.filter(
    (u) =>
      u.id !== opts.authorId &&
      handlesFor(u).some((h) => tokenSet.has(h)),
  );
  if (matched.length === 0) return;

  await prisma.notification.createMany({
    data: matched.map((u) => ({
      type: "mention",
      userId: u.id,
      commentId: opts.commentId,
    })),
  });

  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  await Promise.all(
    matched.map((u) =>
      sendMail({
        to: u.email,
        subject: `${opts.authorName} mentioned you in ARKO`,
        html: mentionEmail({
          mentionedBy: opts.authorName,
          context: opts.contextLabel,
          url: `${base}${opts.url}`,
        }),
      }),
    ),
  );
}
