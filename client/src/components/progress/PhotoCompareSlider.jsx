import { useEffect, useMemo, useState } from 'react';
import { MoveHorizontal } from 'lucide-react';
import { PHOTO_POSES } from '../../lib/progress.api';
import { cn } from '../../lib/utils';
import Card, { CardHeader } from '../ui/Card';

export function PhotoCompareSlider({ photos = [] }) {
  const [pose, setPose] = useState('front');
  const [sliderPos, setSliderPos] = useState(50);

  const posePhotos = useMemo(
    () =>
      photos
        .filter((p) => p.pose === pose)
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date)),
    [photos, pose]
  );

  const [beforeId, setBeforeId] = useState('');
  const [afterId, setAfterId] = useState('');

  useEffect(() => {
    if (posePhotos.length >= 2) {
      setBeforeId(posePhotos[0].id);
      setAfterId(posePhotos[posePhotos.length - 1].id);
    } else {
      setBeforeId('');
      setAfterId('');
    }
  }, [pose, posePhotos]);

  const beforePhoto = posePhotos.find((p) => p.id === beforeId) || posePhotos[0];
  const afterPhoto = posePhotos.find((p) => p.id === afterId) || posePhotos[posePhotos.length - 1];

  return (
    <Card>
      <CardHeader
        title="Before and after comparison"
        description="Drag the handle to compare body composition changes across dates"
        action={
          <div className="flex items-center gap-1 rounded-lg border border-line bg-canvas p-0.5">
            {PHOTO_POSES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPose(p)}
                className={cn(
                  'h-7 rounded-md px-2.5 text-xs font-medium capitalize transition-colors',
                  pose === p ? 'bg-surface-raised text-ink' : 'text-ink-secondary hover:text-ink'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />

      {posePhotos.length < 2 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-line bg-canvas px-4 text-center text-sm text-ink-muted">
          Upload at least 2 {pose} progress photos to unlock the side-by-side comparison slider
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs text-ink-muted">Before photo</label>
              <select
                value={beforePhoto?.id || ''}
                onChange={(e) => setBeforeId(e.target.value)}
                className="h-9 w-full rounded-lg border border-line bg-canvas px-2.5 font-mono text-xs text-ink"
              >
                {posePhotos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.date}
                    {p.weightKg ? ` (${p.weightKg} kg)` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-ink-muted">After photo</label>
              <select
                value={afterPhoto?.id || ''}
                onChange={(e) => setAfterId(e.target.value)}
                className="h-9 w-full rounded-lg border border-line bg-canvas px-2.5 font-mono text-xs text-ink"
              >
                {posePhotos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.date}
                    {p.weightKg ? ` (${p.weightKg} kg)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative mx-auto aspect-[4/3] w-full max-w-xl select-none overflow-hidden rounded-xl border border-line bg-black/5 dark:bg-black/30">
            {/* After image (bottom layer) */}
            <img
              src={afterPhoto.imageUrl}
              alt={`After ${afterPhoto.date}`}
              className="h-full w-full object-contain"
            />

            {/* Before image (clipped left side) */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <img
                src={beforePhoto.imageUrl}
                alt={`Before ${beforePhoto.date}`}
                className="h-full w-full object-contain"
              />
            </div>

            {/* Vertical divider + handle */}
            <div
              className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink shadow">
                <MoveHorizontal className="h-4 w-4" strokeWidth={1.75} />
              </div>
            </div>

            {/* Corner labels */}
            <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-md bg-black/70 px-2 py-1 font-mono text-[11px] text-white">
              Before · {beforePhoto.date}
              {beforePhoto.weightKg ? ` · ${beforePhoto.weightKg}kg` : ''}
            </span>
            <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-md bg-black/70 px-2 py-1 font-mono text-[11px] text-white">
              After · {afterPhoto.date}
              {afterPhoto.weightKg ? ` · ${afterPhoto.weightKg}kg` : ''}
            </span>

            {/* Accessible interactive range overlay */}
            <input
              type="range"
              min={0}
              max={100}
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              aria-label="Before and after comparison slider"
              className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

export default PhotoCompareSlider;
