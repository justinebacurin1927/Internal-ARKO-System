import type { Metadata } from "next";
import Link from "next/link";
import ProjectGallery from "./ProjectGallery";

const TITLE = "Projects — Arko Software Studio";
const DESCRIPTION =
  "Selected websites and digital products designed and built by Arko.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/projects" },
  openGraph: {
    type: "website",
    url: "/projects",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function ProjectsPage() {
  return (
    <div id="top" className="min-h-screen bg-ink text-white">
      <section
        data-bg="light"
        className="relative overflow-hidden bg-acid px-6 pb-20 pt-32 text-ink md:px-10 md:pb-28 md:pt-44"
      >
        <div className="project-grid absolute inset-0 opacity-20" aria-hidden />
        <div className="relative mx-auto max-w-[90rem]">
          <p className="eyebrow text-ink/60">Selected work / 2025—2026</p>
          <h1 className="display mt-5 text-[clamp(4rem,11vw,10rem)] leading-[0.82]">
            Projects
          </h1>
          <p className="mt-10 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70 md:text-2xl">
            Websites and digital products built to turn an idea into something
            people can use.
          </p>
        </div>
      </section>

      <section className="px-6 py-16 md:px-10 md:py-24">
        <ProjectGallery />
      </section>

      <section
        data-bg="light"
        className="border-t-4 border-ink bg-acid px-6 py-20 text-ink md:px-10 md:py-28"
      >
        <div className="mx-auto flex max-w-[90rem] flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="eyebrow text-ink/55">Have a project in mind?</p>
            <h2 className="display mt-4 text-[clamp(3rem,9vw,7rem)]">
              Let&apos;s make it real.
            </h2>
          </div>
          <Link
            href="/#contact"
            className="mono border-4 border-ink bg-ink px-7 py-4 text-xs font-bold uppercase tracking-[0.16em] text-acid transition-transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-ink/30"
          >
            Start a project →
          </Link>
        </div>
      </section>
    </div>
  );
}
