import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

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

const PROJECTS = [
  {
    title: "BMW",
    domain: "unofficial-bmw.vercel.app",
    href: "https://unofficial-bmw.vercel.app",
    image: "/projects/unofficial-bmw.png",
  },
  {
    title: "Omniscient Reader's Viewpoint",
    domain: "unofficial-omniscient-readers-viewpoint.vercel.app",
    href: "https://unofficial-omniscient-readers-viewpoint.vercel.app",
    image: "/projects/unofficial-omniscient-readers-viewpoint.png",
  },
  {
    title: "Co-Map",
    domain: "co-map.vercel.app",
    href: "https://co-map.vercel.app",
    image: "/projects/co-map.png",
  },
  {
    title: "Yuenansichu Restaurant",
    domain: "yuenansichu-restaurant.vercel.app",
    href: "https://yuenansichu-restaurant.vercel.app/",
    image: "/projects/yuenansichu-restaurant.png",
  },
  {
    title: "Kapet Balay",
    domain: "kapetbalay.vercel.app",
    href: "https://kapetbalay.vercel.app/",
    image: "/projects/kapetbalay.png",
  },
] as const;

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
          <h1 className="display mt-5 text-[clamp(4rem,14vw,13rem)] leading-[0.78]">
            Projects
          </h1>
          <p className="mt-10 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70 md:text-2xl">
            Websites and digital products built to turn an idea into something
            people can use.
          </p>
        </div>
      </section>

      <section className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto grid max-w-[90rem] gap-8 md:grid-cols-2">
          {PROJECTS.map((project, index) => (
            <a
              key={project.href}
              href={project.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group border-4 border-acid bg-ink p-4 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white md:p-6"
            >
              <div className="relative aspect-[16/10] overflow-hidden border border-acid/20 bg-black">
                <Image
                  src={project.image}
                  alt={`${project.title} homepage, captured from hero to footer`}
                  fill
                  priority={index < 2}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                />
              </div>
              <div className="flex items-end justify-between gap-6 px-1 pb-2 pt-6">
                <div>
                  <p className="eyebrow text-acid/60">Project / 0{index + 1}</p>
                  <h2 className="display mt-2 text-3xl transition-colors group-hover:text-acid md:text-5xl">
                    {project.title}
                  </h2>
                  <p className="mono mt-2 break-all text-xs text-white/40">
                    {project.domain}
                  </p>
                </div>
                <span className="display text-4xl text-acid" aria-hidden="true">
                  ↗
                </span>
              </div>
            </a>
          ))}
        </div>
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
