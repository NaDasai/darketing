import { cn } from '@/lib/utils';

// Eagle Eyes "EE" monogram — two block letters mirrored across the
// vertical center, fill follows currentColor.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 160"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('block', className)}
    >
      {/* Left mirrored E */}
      <path d="M 10 15 L 118 15 L 118 145 L 10 145 L 10 115 L 88 115 L 88 90 L 10 90 L 10 70 L 88 70 L 88 45 L 10 45 Z" />
      {/* Right E */}
      <path d="M 122 15 L 230 15 L 230 45 L 152 45 L 152 70 L 230 70 L 230 90 L 152 90 L 152 115 L 230 115 L 230 145 L 122 145 Z" />
    </svg>
  );
}
