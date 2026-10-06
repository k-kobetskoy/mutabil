'use client';
/**
 * Photos and videos of the home (decisions D27). Everything is optional: one general comment
 * is enough, detailed marks on photos are a bonus. Files stay on this device (IndexedDB) until
 * the request is sent.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, PenLine, Trash2, Video } from 'lucide-react';
import { useMediaStore, type MediaItem } from '@/state/private-store';
import { Button } from '@/ui/Button';
import { TextInput } from '@/ui/Fields';
import { useCfg, useServices } from '../configurator/providers';
import { cleanPhoto, isVideo } from './process';

const PhotoEditor = lazy(() => import('./PhotoEditor').then((m) => ({ default: m.PhotoEditor })));

export function MediaBlock() {
  const t = useTranslations();
  const cfg = useCfg();
  const { uploads } = useServices();
  const all = useMediaStore((s) => s.items);
  const add = useMediaStore((s) => s.add);
  const remove = useMediaStore((s) => s.remove);
  const note = useMediaStore((s) => s.generalNote);
  const setNote = useMediaStore((s) => s.setGeneralNote);
  const items = all.filter((i) => i.kind === 'photo' || i.kind === 'video');
  const photos = items.filter((i) => i.kind === 'photo');
  const videos = items.filter((i) => i.kind === 'video');
  const [limit, setLimit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const M = cfg.app.media;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setLimit(null);
    let p = photos.length;
    let v = videos.length;
    let mb = videos.reduce((s, x) => s + x.size / 1e6, 0);
    for (const f of Array.from(files)) {
      if (isVideo(f.type)) {
        if (v >= M.maxVideos || mb + f.size / 1e6 > M.maxVideoTotalMb) {
          setLimit(t('media.tooMany', { max: `${M.maxVideos} ${t('media.video')} · ${M.maxVideoTotalMb} MB` }));
          continue;
        }
        add(await uploads.put(f, { kind: 'video', name: f.name }));
        v++;
        mb += f.size / 1e6;
      } else if (f.type.startsWith('image/')) {
        if (p >= M.maxPhotos) {
          setLimit(t('media.tooMany', { max: M.maxPhotos }));
          continue;
        }
        const clean = await cleanPhoto(f, M.photoMaxSidePx, M.photoJpegQuality).catch(() => null);
        if (!clean) continue;
        add(await uploads.put(clean, { kind: 'photo', name: f.name.replace(/\.\w+$/, '.jpg') }));
        p++;
      }
    }
    setBusy(false);
  };

  return (
    <section aria-labelledby="media-title" className="flex flex-col gap-4">
      <div>
        <h2 id="media-title" className="text-[1.25rem] font-extrabold">
          {t('steps.items.media')} <span className="text-[0.95rem] font-normal text-ink-muted">· {t('common.optional')}</span>
        </h2>
        <p className="mt-1 text-[0.95rem] text-ink-muted">{t('steps.items.mediaText')}</p>
      </div>
      <p className="rounded-lg border-l-4 border-route bg-route-soft px-4 py-3 text-[0.92rem] leading-snug">{t('media.notice')}</p>

      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((m) => (
            <MediaTile key={m.id} item={m} onRemove={() => void uploads.remove(m.id).then(() => remove(m.id))} onMark={() => setEditing(m)} />
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-[var(--radius-field)] bg-night px-5 font-[family-name:var(--font-display)] font-bold text-white hover:bg-night-3 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-route">
          <ImagePlus size={20} aria-hidden />
          {busy ? t('common.loading') : t('media.add')}
          <input type="file" multiple accept="image/*,video/*" className="sr-only" disabled={busy} onChange={(e) => void onFiles(e.target.files).then(() => (e.target.value = ''))} />
        </label>
        <p className="text-[0.88rem] text-ink-muted" aria-live="polite">
          {t('media.photos', { count: photos.length })} · {t('media.videos', { count: videos.length })}
        </p>
      </div>
      {limit && (
        <p role="alert" className="text-[0.92rem] font-semibold text-error">
          {limit}
        </p>
      )}
      <p className="text-[0.85rem] text-ink-muted">{t('media.local')}</p>

      <TextInput label={t('media.note')} value={note} onChange={setNote} multiline placeholder={t('media.notePlaceholder')} />

      {editing && (
        <Suspense fallback={null}>
          <PhotoEditor item={editing} onClose={() => setEditing(null)} />
        </Suspense>
      )}
    </section>
  );
}

/** Object URLs are made per mount from the IndexedDB blob, never persisted. */
export function useMediaUrl(id: string) {
  const { uploads } = useServices();
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let u: string | undefined;
    let live = true;
    void uploads.get(id).then((b) => {
      if (!b || !live) return;
      u = URL.createObjectURL(b);
      setUrl(u);
    });
    return () => {
      live = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [id, uploads]);
  return url;
}

function MediaTile({ item, onRemove, onMark }: { item: MediaItem; onRemove: () => void; onMark: () => void }) {
  const t = useTranslations();
  const url = useMediaUrl(item.id);
  const marks = (item.annotation?.strokes.length ?? 0) + (item.annotation?.pins.length ?? 0);
  return (
    <li className="flex flex-col overflow-hidden rounded-[var(--radius-field)] border border-line bg-paper">
      <div className="relative aspect-[4/3] bg-cloud">
        {url && item.kind === 'photo' && (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img src={url} alt={item.annotation?.note || item.name} className="size-full object-cover" />
        )}
        {url && item.kind === 'video' && <video src={url} className="size-full object-cover" muted playsInline preload="metadata" aria-label={item.name} />}
        {item.kind === 'video' && (
          <span className="label-cap absolute top-2 left-2 flex items-center gap-1 rounded bg-night/80 px-1.5 py-0.5 text-[0.62rem] text-white">
            <Video size={12} aria-hidden /> {t('media.video')}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 p-1.5">
        {item.kind === 'photo' ? (
          <Button variant="ghost" onPress={onMark} className="!min-h-10 !px-2 text-[0.85rem]">
            <PenLine size={16} aria-hidden />
            {marks ? t('media.marks', { count: marks }) : t('media.mark')}
          </Button>
        ) : (
          <span className="px-2 text-[0.8rem] text-ink-muted">{Math.round(item.size / 1e5) / 10} MB</span>
        )}
        <Button variant="ghost" onPress={onRemove} aria-label={`${t('common.remove')}: ${item.name}`} className="!min-h-10 !px-2">
          <Trash2 size={16} aria-hidden />
        </Button>
      </div>
    </li>
  );
}
