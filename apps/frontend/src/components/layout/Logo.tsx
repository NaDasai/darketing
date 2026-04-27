import { cn } from '@/lib/utils';

// Hand-traced approximation of the Dar Blockchain mark — a stylized "n"
// shape with a shortened left leg. Drop the real SVG into
// apps/frontend/public/logo.svg and swap this component for an <img> if you
// want pixel accuracy.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('block', className)}
    >
      {/* Right arch: thick inverted-U with inner cavity carved out */}
      <path
        d="
          M 40 80
          L 40 35
          A 35 35 0 0 1 110 35
          L 110 74
          Q 110 80 104 80
          L 81 80
          Q 75 80 75 74
          L 75 40
          A 10 10 0 0 0 55 40
          L 55 80
          Z
        "
      />
      {/* Left short leg: rounded rectangle that merges into the arch body */}
      <path
        d="
          M 5 35
          L 36 35
          Q 41 35 41 40
          L 41 74
          Q 41 80 35 80
          L 5 80
          Q 0 80 0 74
          L 0 41
          Q 0 35 5 35
          Z
        "
      />
    </svg>
  );
}
