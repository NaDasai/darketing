import type { PostDto } from '@eagle-eyes/shared';

export function PlatformPreview({
  post,
  content,
}: {
  post: PostDto;
  content: string;
}) {
  if (post.platform === 'TWITTER') {
    return <TwitterPreview content={content} />;
  }
  return <LinkedInPreview content={content} />;
}

function TwitterPreview({ content }: { content: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-zinc-700" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">You</span>
          <span className="text-xs text-zinc-500">@you · now</span>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-[15px] leading-snug">
        {content || (
          <span className="text-zinc-500">
            Your post preview appears here.
          </span>
        )}
      </p>
    </div>
  );
}

function LinkedInPreview({ content }: { content: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-zinc-700" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">You</span>
          <span className="text-xs text-zinc-500">Your title · now</span>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {content || (
          <span className="text-zinc-500">
            Your post preview appears here.
          </span>
        )}
      </p>
    </div>
  );
}
