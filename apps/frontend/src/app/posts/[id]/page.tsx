'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PostDto, PostStatus, UpdatePostInput } from '@eagle-eyes/shared';
import { ApiError, postsApi } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Skeleton,
  Textarea,
  useToast,
} from '@/components/ui';
import { PlatformPreview } from '@/components/posts/Previews';
import { cn, formatRelative } from '@/lib/utils';

const AI_EDIT_PRESETS = [
  'Make it shorter',
  'More punchy',
  'Less formal',
  'Tighten the hook',
  'Add a clear takeaway',
] as const;

const TWITTER_LIMIT = 280;
const TWITTER_WARNING = 260;

export default function PostEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? '';
  const qc = useQueryClient();
  const { toast } = useToast();
  const taRef = useRef<HTMLTextAreaElement>(null);

  const post = useQuery({
    queryKey: ['post', id],
    queryFn: ({ signal }) => postsApi.get(id, signal),
    enabled: !!id,
  });

  const [draft, setDraft] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [previousDraft, setPreviousDraft] = useState<string | null>(null);

  useEffect(() => {
    if (post.data && !hydrated) {
      setDraft(post.data.editedContent ?? post.data.content);
      setHydrated(true);
    }
  }, [post.data, hydrated]);

  const dirty = useMemo(() => {
    if (!post.data) return false;
    const saved = post.data.editedContent ?? post.data.content;
    return draft !== saved;
  }, [draft, post.data]);

  const patch = useMutation({
    mutationFn: (input: UpdatePostInput) => postsApi.update(id, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ['post', id] });
      const previous = qc.getQueryData<PostDto>(['post', id]);
      if (previous) {
        qc.setQueryData<PostDto>(['post', id], {
          ...previous,
          ...(input.editedContent !== undefined
            ? { editedContent: input.editedContent }
            : {}),
          ...(input.status ? { status: input.status } : {}),
        });
      }
      return { previous };
    },
    onError: (err: unknown, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(['post', id], ctx.previous);
      const msg = err instanceof ApiError ? err.message : 'Save failed';
      toast(msg, 'error');
    },
    onSuccess: (next) => {
      qc.setQueryData(['post', id], next);
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const aiEdit = useMutation({
    mutationFn: (vars: { instruction: string; currentContent: string }) =>
      postsApi.aiEdit(id, vars),
    onSuccess: (result, vars) => {
      setPreviousDraft(vars.currentContent);
      setDraft(result.content);
      toast('AI rewrite ready — review and save', 'success');
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'AI edit failed';
      toast(msg, 'error');
    },
  });

  const runAiEdit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast('Type an instruction first', 'error');
      return;
    }
    if (!draft.trim()) {
      toast('Nothing to rewrite', 'error');
      return;
    }
    aiEdit.mutate({ instruction: trimmed, currentContent: draft });
  };

  const undoAiEdit = () => {
    if (previousDraft === null) return;
    setDraft(previousDraft);
    setPreviousDraft(null);
    toast('Reverted AI rewrite', 'info');
  };

  const save = () => {
    if (!dirty) return;
    patch.mutate(
      { editedContent: draft },
      {
        onSuccess: () => {
          setPreviousDraft(null);
          toast('Saved', 'success');
        },
      },
    );
  };

  const approve = () => {
    patch.mutate(
      { status: 'APPROVED' },
      { onSuccess: () => toast('Approved', 'success') },
    );
  };

  const reject = () => {
    patch.mutate(
      { status: 'REJECTED' },
      { onSuccess: () => toast('Rejected', 'info') },
    );
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      toast('Copied to clipboard', 'success');
    } catch {
      toast('Copy failed', 'error');
    }
  };

  const shareToPlatform = async () => {
    if (!post.data) return;
    const text = draft.trim();
    if (!text) {
      toast('Nothing to share', 'error');
      return;
    }
    const isX = post.data.platform === 'TWITTER';
    const url = isX
      ? `https://x.com/intent/post?text=${encodeURIComponent(text)}`
      : `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;

    // LinkedIn's web compose doesn't reliably honor the `text` param across
    // logged-in states, so always copy to clipboard so the user can paste in
    // one keystroke. Harmless for X but the intent URL there fills text
    // directly.
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // Ignore — clipboard may be unavailable in some browsers/contexts.
    }

    window.open(url, '_blank', 'noopener,noreferrer');

    if (isX) {
      toast('Opened X compose', 'info');
    } else {
      toast(
        copied
          ? 'Opened LinkedIn — text copied, paste if not pre-filled'
          : 'Opened LinkedIn — paste your text into the composer',
        'info',
      );
    }
  };

  // Keyboard shortcuts — re-registered each render so callbacks see fresh
  // `draft` and `dirty` without a ref dance.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      const taActive = document.activeElement === taRef.current;
      if (key === 's') {
        e.preventDefault();
        save();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        approve();
      } else if (key === 'c' && !taActive) {
        // Only intercept ⌘C when the textarea is NOT focused so native copy
        // of a selection inside the editor still works as expected.
        e.preventDefault();
        void copyToClipboard();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [draft, dirty]);

  if (post.isPending) {
    return (
      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-10 lg:grid-cols-2">
        <Skeleton className="h-[70vh] w-full" />
        <Skeleton className="h-[70vh] w-full" />
      </main>
    );
  }

  if (post.isError || !post.data) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-10 text-center text-zinc-600 dark:text-zinc-400">
        <p>Couldn&apos;t load this post.</p>
        <button
          className="mt-3 text-accent-300 hover:underline"
          onClick={() => router.back()}
        >
          ← Back
        </button>
      </main>
    );
  }

  const p = post.data;
  const isTwitter = p.platform === 'TWITTER';
  const count = draft.length;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <nav className="flex items-center justify-between text-sm">
        <Link
          href={`/projects/${p.projectId}`}
          className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Back to project
        </Link>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Badge tone={isTwitter ? 'accent' : 'neutral'}>
            {isTwitter ? 'X' : 'LinkedIn'}
          </Badge>
          <Badge tone={statusTone(p.status)}>{p.status}</Badge>
          <span>Updated {formatRelative(p.updatedAt)}</span>
        </div>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
              Editor
            </h2>
            {isTwitter ? (
              <span
                className={cn(
                  'text-xs tabular-nums',
                  count >= TWITTER_LIMIT
                    ? 'text-red-400'
                    : count >= TWITTER_WARNING
                      ? 'text-amber-400'
                      : 'text-zinc-500',
                )}
              >
                {count} / {TWITTER_LIMIT}
              </span>
            ) : null}
          </div>
          <Textarea
            ref={taRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (previousDraft !== null) setPreviousDraft(null);
            }}
            rows={16}
            className="min-h-[40vh] font-mono text-sm"
            spellCheck
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={!dirty}>
              Save (⌘S)
            </Button>
            <Button variant="secondary" onClick={approve}>
              Approve (⌘↵)
            </Button>
            <Button variant="ghost" onClick={reject}>
              Reject
            </Button>
            <Button variant="secondary" onClick={copyToClipboard}>
              Copy
            </Button>
            <Button
              variant="secondary"
              onClick={shareToPlatform}
              disabled={!draft.trim()}
            >
              {isTwitter ? 'Share on X' : 'Share on LinkedIn'}
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            ⌘C copies the draft when the textarea is blurred. Native
            selection copy inside the editor still works.
          </p>

          <div className="mt-2 flex flex-col gap-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                Edit with AI
              </h3>
              {previousDraft !== null ? (
                <button
                  type="button"
                  onClick={undoAiEdit}
                  className="text-xs text-accent-300 hover:underline"
                >
                  Undo rewrite
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {AI_EDIT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => runAiEdit(preset)}
                  disabled={aiEdit.isPending}
                  className={cn(
                    'rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-1 text-xs text-zinc-700 dark:text-zinc-300 transition',
                    'hover:border-accent-400/60 hover:text-zinc-900 dark:hover:text-zinc-100',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. Lead with the number, drop the second paragraph"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !aiEdit.isPending) {
                    e.preventDefault();
                    runAiEdit(instruction);
                  }
                }}
                disabled={aiEdit.isPending}
              />
              <Button
                onClick={() => runAiEdit(instruction)}
                disabled={aiEdit.isPending || !instruction.trim()}
              >
                {aiEdit.isPending ? 'Rewriting…' : 'Apply'}
              </Button>
            </div>
            <p className="text-xs text-zinc-500">
              The rewrite replaces your draft. Save to persist, or undo to
              revert.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
            Preview
          </h2>
          <PlatformPreview post={p} content={draft} />
          <Card>
            <CardContent className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              <span>Created {formatRelative(p.createdAt)}</span>
              <span>
                Source item{' '}
                <code className="text-zinc-700 dark:text-zinc-300">{p.contentItemId}</code>
              </span>
              {p.variant ? <span>Variant {p.variant}</span> : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function statusTone(
  status: PostStatus,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'SUGGESTED') return 'warning';
  return 'neutral';
}
