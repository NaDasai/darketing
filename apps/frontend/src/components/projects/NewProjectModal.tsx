'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreateProjectSchema,
  TONE_VALUES,
  type CreateProjectInput,
  type Tone,
} from '@darketing/shared';
import { projectsApi, ApiError } from '@/lib/api';
import {
  Button,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from '@/components/ui';

const EMPTY: CreateProjectInput = {
  name: '',
  description: '',
  tone: 'PROFESSIONAL',
  targetAudience: '',
  domain: '',
  topNPerRun: 5,
  isActive: true,
};

export function NewProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateProjectInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: (input: CreateProjectInput) => projectsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast('Project created', 'success');
      setForm(EMPTY);
      setErrors({});
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to create project';
      toast(msg, 'error');
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = CreateProjectSchema.safeParse(form);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(flat)) {
        if (v && v.length) out[k] = v[0] as string;
      }
      setErrors(out);
      return;
    }
    setErrors({});
    create.mutate(parsed.data);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project"
      description="Pipe RSS feeds into scored, rewritten posts."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Name" error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="AI tooling digest"
            autoFocus
          />
        </Field>
        <Field label="Description" error={errors.description}>
          <Textarea
            rows={2}
            value={form.description ?? ''}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder="Optional — short project summary"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tone" error={errors.tone}>
            <Select
              value={form.tone}
              onChange={(e) =>
                setForm({ ...form, tone: e.target.value as Tone })
              }
            >
              {TONE_VALUES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Top N per run" error={errors.topNPerRun}>
            <Input
              type="number"
              min={1}
              max={50}
              value={form.topNPerRun ?? 5}
              onChange={(e) =>
                setForm({
                  ...form,
                  topNPerRun:
                    e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </Field>
        </div>
        <Field label="Domain" error={errors.domain}>
          <Input
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            placeholder="developer tooling / fintech / climate"
          />
        </Field>
        <Field label="Target audience" error={errors.targetAudience}>
          <Input
            value={form.targetAudience}
            onChange={(e) =>
              setForm({ ...form, targetAudience: e.target.value })
            }
            placeholder="backend engineers building side-projects"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={form.isActive ?? true}
            onChange={(e) =>
              setForm({ ...form, isActive: e.target.checked })
            }
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-accent-500"
          />
          Run on schedule
        </label>
        <div className="mt-2 flex items-center justify-end gap-2 border-t border-zinc-800 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={create.isPending}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
