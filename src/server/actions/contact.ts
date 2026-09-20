"use server";

import { z } from "zod";
import { getEmailProvider } from "@/server/email/provider";
import { checkRateLimit } from "@/server/rate-limit";
import type { ActionState } from "@/server/actions/auth";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().min(10, "Tell us a bit more (min 10 characters)"),
});

export async function contactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    company: String(formData.get("company") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }

  const rl = await checkRateLimit(`contact:${parsed.data.email}`, 5, 60 * 60);
  if (!rl.allowed) return { error: "Too many requests. Please try again later." };

  await getEmailProvider().send({
    to: "sales@minicrm.example",
    subject: `New contact request from ${parsed.data.name}`,
    html: `<p><b>Name:</b> ${parsed.data.name}</p><p><b>Email:</b> ${parsed.data.email}</p><p><b>Company:</b> ${parsed.data.company ?? "-"}</p><p><b>Message:</b> ${parsed.data.message}</p>`,
    text: `${parsed.data.name} <${parsed.data.email}> (${parsed.data.company}): ${parsed.data.message}`,
  });

  return { error: undefined };
}
