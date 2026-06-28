import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/NavLink";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const unread = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/board" className="text-lg font-bold text-gray-900">
              ARKO
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink href="/board">Board</NavLink>
              <NavLink href="/docs">Docs</NavLink>
              <NavLink href="/notifications">
                Notifications
                {unread > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
                    {unread}
                  </span>
                )}
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session.user.name}
              <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                {session.user.role}
              </span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
