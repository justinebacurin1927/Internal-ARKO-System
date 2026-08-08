"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StarBorder from "./StarBorder";

const NAV = [
  { label: "Work", href: "/#work" },
  { label: "Projects", href: "/projects" },
  { label: "Services", href: "/#services" },
  { label: "Process", href: "/#process" },
  { label: "Contact", href: "/#contact" },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [onGreen, setOnGreen] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const sections = document.querySelectorAll('[data-bg="light"]');
    const observer = new IntersectionObserver(
      (entries) => {
        const active = entries.some((e) => e.isIntersecting);
        setOnGreen(active);
      },
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  // Green background → dark header (ink bg, white text)
  // Dark background (video, etc.) → acid header (green bg, black text)
  const greenBgHeader = onGreen;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        greenBgHeader
          ? "border-b border-white/10 bg-ink/90 backdrop-blur-md"
          : "bg-acid/90 backdrop-blur-sm"
      }`}
    >
      <div className="flex h-16 items-center justify-between px-6 md:h-20 md:px-10">
        <Link href="/" className="flex items-baseline gap-2 leading-none">
          <span
            className={`display text-2xl transition-colors md:text-3xl ${
              greenBgHeader ? "text-acid" : "text-ink"
            }`}
          >
            ARKO
          </span>
          <span
            className={`eyebrow hidden transition-colors sm:block ${
              greenBgHeader ? "text-white/50" : "text-ink/60"
            }`}
          >
            Software Studio
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`eyebrow transition-colors hover:opacity-60 ${
                greenBgHeader ? "text-white" : "text-ink"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4 md:gap-6">
          <a
            href="/auth/login"
            className={`eyebrow transition-colors hover:opacity-60 ${
              greenBgHeader ? "text-white" : "text-ink"
            }`}
          >
            Login
          </a>
          <StarBorder
            as="a"
            href="/#contact"
            color={greenBgHeader ? "#b8ff2e" : "#0a0a0a"}
            className="scale-90 md:scale-100"
          >
            Start a project
          </StarBorder>
        </div>
      </div>
    </header>
  );
}
