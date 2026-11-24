import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { PHOTO_POSES } from '../../lib/progress.api';
import { getTodayDateStr } from '../../lib/schedule.api';
import { cn } from '../../lib/utils';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

export function PhotoUploadModal({ isOpen, onClose, clientId, onUpload, isUploading = false }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [pose, setPose] = useState('front');
  const [date, setDate] = useState(getTodayDateStr());
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setPreviewUrl('');
    setPose('front');
    setDate(getTodayDateStr());
    setWeightKg('');
    setNotes('');
  }, [isOpen]);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (e) => {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    if (chosen.size > 5 * 1024 * 1024) {
      toast.error('Photo must be 5 MB or smaller');
      return;
    }
    setFile(chosen);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Select a progress photo');
      return;
    }

    const formData = new FormData();
    formData.append('clientId', clientId);
    formData.append('date', date);
    formData.append('pose', pose);
    if (weightKg !== '') formData.append('weightKg', weightKg);
    if (notes) formData.append('notes', notes);
    formData.append('photo', file);

    onUpload(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload progress photo"
      description="Tag front, side, or back pose for side-by-side comparison"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-raised hover:border-accent transition-colors">
          {previewUrl ? (
            <img src={previewUrl} alt="Progress preview" className="h-full w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-center text-ink-muted">
              <Camera className="h-7 w-7" strokeWidth={1.5} />
              <span className="text-sm font-medium text-ink">Choose photo</span>
              <span className="text-xs">JPG, PNG, WebP (max 5 MB)</span>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">Pose</span>
          <div className="grid grid-cols-3 gap-2">
            {PHOTO_POSES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPose(p)}
                className={cn(
                  'h-10 rounded-lg border text-sm font-medium capitalize transition-colors',
                  pose === p
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-surface text-ink-secondary hover:text-ink'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Weight (kg, optional)"
            type="number"
            step="0.1"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="78.5"
          />
        </div>

        <Input
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Week 4 check-in"
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isUploading}>
            Upload photo
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default PhotoUploadModal;
