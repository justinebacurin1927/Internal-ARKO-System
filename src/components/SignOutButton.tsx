import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        Sign out
      </button>
    </form>
  );
}
