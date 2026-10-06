'use client';
import type { MediaItem } from '@/state/private-store';

/** Placeholder until the annotation editor lands (task: photo/video editor). */
export function PhotoEditor({ onClose }: { item: MediaItem; onClose: () => void }) {
  onClose();
  return null;
}
