'use client';

import { create } from 'zustand';
import type { Platform, PostStatus } from '@darketing/shared';

export type PlatformFilter = Platform | 'ALL';

interface UiStore {
  activeProjectId: string | null;
  statusFilter: PostStatus;
  platformFilter: PlatformFilter;

  setActiveProjectId: (id: string | null) => void;
  setStatusFilter: (status: PostStatus) => void;
  setPlatformFilter: (platform: PlatformFilter) => void;
  reset: () => void;
}

const defaults: Pick<
  UiStore,
  'activeProjectId' | 'statusFilter' | 'platformFilter'
> = {
  activeProjectId: null,
  statusFilter: 'SUGGESTED',
  platformFilter: 'ALL',
};

export const useUiStore = create<UiStore>((set) => ({
  ...defaults,
  setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setPlatformFilter: (platformFilter) => set({ platformFilter }),
  reset: () => set({ ...defaults }),
}));
