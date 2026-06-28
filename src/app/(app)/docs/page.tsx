import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createDocument } from "./actions";

export default async function DocsPage() {
  const docs = await prisma.document.findMany({
    orderBy: { updatedAt: "desc" },
    include: { author: true, milestone: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Docs</h1>
        <form action={createDocument}>
          <button className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700">
            + New doc
          </button>
        </form>
      </div>

      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {docs.map((d) => (
          <li key={d.id}>
            <Link
              href={`/docs/${d.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div>
                <p className="font-medium text-gray-900">{d.title}</p>
                <p className="text-xs text-gray-500">
                  {d.author.name}
                  {d.milestone && ` · ${d.milestone.name}`}
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {d.updatedAt.toLocaleDateString()}
              </span>
            </Link>
          </li>
        ))}
        {docs.length === 0 && (
          <li className="px-4 py-6 text-sm text-gray-400">No documents yet.</li>
        )}
      </ul>
    </div>
  );
}
