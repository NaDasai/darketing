'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TONE_VALUES,
  UpdateProjectSchema,
  type ProjectDto,
  type Tone,
  type UpdateProjectInput,
} from '@eagle-eyes/shared';
import { ApiError, projectsApi } from '@/lib/api';
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  Textarea,
  useToast,
} from '@/components/ui';
import { ScheduleEditor } from './ScheduleEditor';

export function SettingsTab({ project }: { project: ProjectDto }) {
  const [form, setForm] = useState<UpdateProjectInput>(pick(project));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    setForm(pick(project));
  }, [project.id, project.updatedAt]);

  const update = useMutation({
    mutationFn: (input: UpdateProjectInput) =>
      projectsApi.update(project.id, input),
    onSuccess: (next) => {
      qc.setQueryData(['project', project.id], next);
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast('Project updated', 'success');
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Update failed';
      toast(msg, 'error');
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = UpdateProjectSchema.safeParse(form);
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
    update.mutate(parsed.data);
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Name" error={errors.name}>
            <Input
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Description" error={errors.description}>
            <Textarea
              rows={2}
              value={form.description ?? ''}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tone" error={errors.tone}>
              <Select
                value={form.tone ?? 'PROFESSIONAL'}
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
            <Field label="Top picks per run" error={errors.topNPerRun}>
              <Input
                type="number"
                min={1}
                max={50}
                value={form.topNPerRun ?? 5}
                onChange={(e) =>
                  setForm({
                    ...form,
                    topNPerRun:
                      e.target.value === ''
                        ? undefined
                        : Number(e.target.value),
                  })
                }
              />
              <p className="text-xs text-zinc-500">
                After each run, the highest-scoring N new items are selected
                and the AI writes one X post + one LinkedIn post for each.
                With {form.topNPerRun ?? 5} picks you get up to{' '}
                <span className="text-zinc-300 tabular-nums">
                  {(form.topNPerRun ?? 5) * 2}
                </span>{' '}
                drafts to approve per run.
              </p>
            </Field>
          </div>
          <Field label="Domain" error={errors.domain}>
            <Input
              value={form.domain ?? ''}
              onChange={(e) =>
                setForm({ ...form, domain: e.target.value })
              }
            />
          </Field>
          <Field label="Target audience" error={errors.targetAudience}>
            <Input
              value={form.targetAudience ?? ''}
              onChange={(e) =>
                setForm({ ...form, targetAudience: e.target.value })
              }
            />
          </Field>
          <Field label="Pipeline schedule" error={errors.schedule}>
            <ScheduleEditor
              value={form.schedule ?? '0 6 * * *'}
              onChange={(next) => setForm({ ...form, schedule: next })}
              error={errors.schedule}
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
          <div className="flex items-center justify-end border-t border-zinc-800 pt-4">
            <Button type="submit" isLoading={update.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function pick(p: ProjectDto): UpdateProjectInput {
  return {
    name: p.name,
    description: p.description,
    tone: p.tone,
    targetAudience: p.targetAudience,
    domain: p.domain,
    topNPerRun: p.topNPerRun,
    isActive: p.isActive,
    schedule: p.schedule,
  };
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
