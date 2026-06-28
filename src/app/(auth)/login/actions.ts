"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function authenticate(
  _prev: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: (formData.get("callbackUrl") as string) || "/board",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw error; // re-throw redirect control-flow
  }
}
