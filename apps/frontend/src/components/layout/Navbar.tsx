import Link from 'next/link';
import { Logo } from './Logo';

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/projects"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <Logo className="h-5 w-auto text-[#2400ff] drop-shadow-[0_0_8px_rgba(36,0,255,0.6)]" />
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Eagle Eyes
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/projects"
            className="rounded-md px-3 py-1.5 text-zinc-300 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
          >
            Projects
          </Link>
        </nav>
      </div>
    </header>
  );
}
