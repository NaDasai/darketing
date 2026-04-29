import Link from 'next/link';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-300/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/projects"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <Logo className="h-5 w-auto text-[#2400ff] drop-shadow-[0_0_8px_rgba(36,0,255,0.6)]" />
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Eagle Eyes
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/projects"
            className="rounded-md px-3 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
          >
            Projects
          </Link>
          <ThemeToggle className="ml-1" />
        </nav>
      </div>
    </header>
  );
}
