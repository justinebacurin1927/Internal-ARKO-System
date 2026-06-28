import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Shared markdown renderer (docs now, storyboard narrative in Phase 2).
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-indigo-600">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
