"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const PROJECTS = [
  {
    title: "BMW",
    domain: "unofficial-bmw.vercel.app",
    href: "https://unofficial-bmw.vercel.app",
    image: "/projects/unofficial-bmw-preview.png",
  },
  {
    title: "Omniscient Reader's Viewpoint",
    domain: "unofficial-omniscient-readers-viewpoint.vercel.app",
    href: "https://unofficial-omniscient-readers-viewpoint.vercel.app",
    image: "/projects/unofficial-omniscient-readers-viewpoint-preview.png",
  },
  {
    title: "Co-Map",
    domain: "co-map.vercel.app",
    href: "https://co-map.vercel.app",
    image: "/projects/co-map-preview.png",
  },
  {
    title: "Yuenansichu Restaurant",
    domain: "yuenansichu-restaurant.vercel.app",
    href: "https://yuenansichu-restaurant.vercel.app/",
    image: "/projects/yuenansichu-restaurant-preview.png",
  },
  {
    title: "Kapet Balay",
    domain: "kapetbalay.vercel.app",
    href: "https://kapetbalay.vercel.app/",
    image: "/projects/kapetbalay-preview.png",
  },
] as const;

type Project = (typeof PROJECTS)[number];

export default function ProjectGallery() {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!activeProject) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveProject(null);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeProject]);

  return (
    <>
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
        {PROJECTS.map((project, index) => (
          <button
            key={project.href}
            type="button"
            onClick={() => setActiveProject(project)}
            className="group cursor-pointer border-4 border-acid bg-ink p-3 text-left transition-colors hover:bg-ink-soft focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white md:p-4"
            aria-label={`Preview ${project.title} without leaving this page`}
          >
            <div className="relative aspect-video overflow-hidden border border-acid/20 bg-black">
              <Image
                src={project.image}
                alt={`${project.title} homepage preview`}
                fill
                priority={index < 2}
                sizes="(min-width: 768px) 560px, calc(100vw - 72px)"
                className="object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.015]"
              />
            </div>
            <div className="flex min-h-28 items-end justify-between gap-5 px-2 pb-2 pt-5">
              <div className="min-w-0">
                <p className="eyebrow text-acid/60">Project / 0{index + 1}</p>
                <h2 className="display mt-2 text-2xl transition-colors group-hover:text-acid md:text-4xl">
                  {project.title}
                </h2>
                <p className="mono mt-2 truncate text-xs text-white/45">
                  {project.domain}
                </p>
              </div>
              <span className="mono shrink-0 border-2 border-acid px-3 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-acid">
                Preview
              </span>
            </div>
          </button>
        ))}
      </div>

      {activeProject && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm md:p-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-preview-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveProject(null);
          }}
        >
          <div className="flex h-[min(86dvh,50rem)] w-full max-w-6xl flex-col border-4 border-acid bg-ink shadow-2xl">
            <div className="flex min-h-16 items-center justify-between gap-4 border-b-4 border-acid px-4 md:px-6">
              <div className="min-w-0">
                <h2 id="project-preview-title" className="display truncate text-xl text-white md:text-3xl">
                  {activeProject.title}
                </h2>
                <p className="mono hidden truncate text-[0.65rem] text-white/45 sm:block">
                  {activeProject.domain}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={activeProject.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono hidden min-h-11 items-center border-2 border-acid px-4 text-[0.65rem] font-bold uppercase tracking-wider text-acid hover:bg-acid hover:text-ink sm:flex"
                >
                  Open live site ↗
                </a>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setActiveProject(null)}
                  className="mono min-h-11 min-w-11 border-2 border-acid text-xl font-bold text-acid hover:bg-acid hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label="Close project preview"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="relative min-h-0 flex-1 bg-black">
              <Image
                src={activeProject.image}
                alt={`${activeProject.title} website preview`}
                fill
                sizes="(min-width: 768px) 1152px, calc(100vw - 30px)"
                className="object-contain"
              />
              <span className="mono absolute bottom-3 left-3 bg-ink/90 px-3 py-2 text-[0.6rem] uppercase tracking-widest text-white/60">
                Preview snapshot
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
