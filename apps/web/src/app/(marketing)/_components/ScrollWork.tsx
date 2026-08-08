"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const WORK = [
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
];

export default function ScrollWork() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const cornerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      // Animate each card on scroll
      cardRefs.current.forEach((el, i) => {
        if (!el) return;

        ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          end: "top 40%",
          scrub: 0.8,
          onUpdate(self) {
            const p = Math.min(1, self.progress * 1.2);
            el.style.opacity = String(p);
            el.style.transform = `translateY(${(1 - p) * 60}px) scale(${0.92 + p * 0.08})`;
          },
        });
      });

      // Decorative corner brackets animate in
      cornerRefs.current.forEach((el) => {
        if (!el) return;
        ScrollTrigger.create({
          trigger: el,
          start: "top 80%",
          end: "top 40%",
          scrub: 0.5,
          onUpdate(self) {
            el.style.opacity = String(Math.min(1, self.progress * 2));
          },
        });
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      id="work"
      ref={sectionRef}
      className="relative bg-ink px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        {/* header */}
        <div className="mb-16 md:mb-20">
          <p className="mono text-sm font-semibold tracking-[0.2em] text-acid/50">
            what we build
          </p>
          <h2 className="display mt-2 text-[clamp(3rem,12vw,10rem)] leading-none text-acid">
            Work
          </h2>
          <p className="mono mt-4 text-sm text-white/40">
            The kind of thing we make
          </p>
        </div>

        {/* cards grid */}
        <div className="grid gap-px overflow-hidden border-4 border-acid bg-acid md:grid-cols-2">
          {WORK.map((item, i) => (
            <a
              key={item.title}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="group relative bg-ink p-4 transition-colors duration-500 focus-visible:z-10 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-white md:p-6"
              style={{ opacity: 0, transform: "translateY(60px) scale(0.92)" }}
            >
              {/* corner brackets — decorative */}
              <div
                ref={(el) => {
                  cornerRefs.current[i] = el;
                }}
                className="pointer-events-none absolute right-4 top-4 text-acid/20 transition-all duration-500 group-hover:text-acid/60"
                style={{ opacity: 0 }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M20 4L20 20L4 20" />
                </svg>
              </div>

              <div className="relative aspect-[16/10] overflow-hidden border border-acid/20 bg-black">
                <Image
                  src={item.image}
                  alt={`${item.title} homepage, captured from hero to footer`}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                />
              </div>

              <div className="mt-6 flex items-end justify-between gap-6">
                <div>
                  <div className="eyebrow text-acid/60">Live project / 0{i + 1}</div>
                  <h3 className="display mt-2 text-3xl text-white transition-colors duration-300 group-hover:text-acid md:text-5xl">
                    {item.title}
                  </h3>
                  <p className="mono mt-2 text-xs text-white/40">{item.domain}</p>
                </div>
                <span className="display text-4xl text-acid" aria-hidden="true">
                  ↗
                </span>
              </div>

              {/* hover line — slides in from left */}
              <div className="absolute bottom-0 left-0 h-[3px] w-0 bg-acid transition-all duration-500 group-hover:w-full" />
            </a>
          ))}
        </div>

        {/* bottom CTA */}
        <div className="mono mt-16 flex items-center gap-4 text-sm font-semibold tracking-wider text-white/30">
          <span className="h-[2px] flex-1 bg-white/10" />
          <a href="#contact" className="transition-colors hover:text-acid">
            See what fits your project →
          </a>
          <span className="h-[2px] flex-1 bg-white/10" />
        </div>
      </div>
    </section>
  );
}
