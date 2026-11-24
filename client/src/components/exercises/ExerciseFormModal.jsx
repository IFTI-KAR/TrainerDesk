import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DIFFICULTY_LEVELS,
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  formatLabel,
} from '../../lib/exercises.api';
import { cn, getApiErrorMessage } from '../../lib/utils';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

const formSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  primaryMuscle: z.enum(MUSCLE_GROUPS),
  equipment: z.enum(EQUIPMENT_TYPES),
  category: z.enum(EXERCISE_CATEGORIES),
  difficulty: z.enum(DIFFICULTY_LEVELS),
  imageUrl: z.string().trim().optional(),
  mediaUrl: z.string().trim().optional(),
  instructionsText: z.string().optional(),
  tipsText: z.string().optional(),
});

export function ExerciseFormModal({ isOpen, onClose, initialExercise = null, onSubmitForm }) {
  const isEditing = Boolean(initialExercise);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [secondaryMuscles, setSecondaryMuscles] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      primaryMuscle: 'chest',
      equipment: 'barbell',
      category: 'strength',
      difficulty: 'intermediate',
      imageUrl: '',
      mediaUrl: '',
      instructionsText: '',
      tipsText: '',
    },
  });

  const watchedPrimaryMuscle = watch('primaryMuscle');
  const watchedImageUrl = watch('imageUrl');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedFile(null);
    if (initialExercise) {
      reset({
        name: initialExercise.name || '',
        primaryMuscle: initialExercise.primaryMuscle || 'chest',
        equipment: initialExercise.equipment || 'barbell',
        category: initialExercise.category || 'strength',
        difficulty: initialExercise.difficulty || 'intermediate',
        imageUrl: initialExercise.imageUrl || '',
        mediaUrl: initialExercise.mediaUrl || '',
        instructionsText: (initialExercise.instructions || []).join('\n'),
        tipsText: (initialExercise.tips || []).join('\n'),
      });
      setPreviewUrl(initialExercise.imageUrl || '');
      setSecondaryMuscles(initialExercise.secondaryMuscles || []);
    } else {
      reset({
        name: '',
        primaryMuscle: 'chest',
        equipment: 'barbell',
        category: 'strength',
        difficulty: 'intermediate',
        imageUrl: '',
        mediaUrl: '',
        instructionsText: '',
        tipsText: '',
      });
      setPreviewUrl('');
      setSecondaryMuscles([]);
    }
  }, [isOpen, initialExercise, reset]);

  useEffect(() => {
    if (!selectedFile) return undefined;
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const toggleSecondaryMuscle = (muscle) => {
    setSecondaryMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }
    setSelectedFile(file);
  };

  const onSubmit = async (values) => {
    if (!selectedFile && !values.imageUrl) {
      toast.error('Upload an exercise image or provide an image URL');
      return;
    }

    const instructions = (values.instructionsText || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const tips = (values.tipsText || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('primaryMuscle', values.primaryMuscle);
    formData.append('equipment', values.equipment);
    formData.append('category', values.category);
    formData.append('difficulty', values.difficulty);
    formData.append(
      'secondaryMuscles',
      JSON.stringify(secondaryMuscles.filter((m) => m !== values.primaryMuscle))
    );
    formData.append('instructions', JSON.stringify(instructions));
    formData.append('tips', JSON.stringify(tips));

    if (values.mediaUrl !== undefined) {
      formData.append('mediaUrl', values.mediaUrl);
    }

    if (selectedFile) {
      formData.append('image', selectedFile);
    } else if (values.imageUrl) {
      formData.append('imageUrl', values.imageUrl);
    }

    try {
      await onSubmitForm(formData, initialExercise?.id);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save exercise'));
    }
  };

  const displayPreview = selectedFile ? previewUrl : watchedImageUrl || previewUrl;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit custom exercise' : 'Add custom exercise'}
      description="Upload an exercise photo or provide an image URL"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-1">
            <span className="block text-sm font-medium text-ink">Image</span>
            <label className="relative flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-raised hover:border-accent transition-colors">
              {displayPreview ? (
                <img
                  src={displayPreview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 px-3 text-center text-ink-muted">
                  <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
                  <span className="text-xs font-medium">Upload photo</span>
                  <span className="text-[11px]">JPG, PNG, WebP (max 5 MB)</span>
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            {selectedFile && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(initialExercise?.imageUrl || '');
                }}
                className="inline-flex items-center gap-1 text-xs text-ink-secondary hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
                Clear selected file
              </button>
            )}
          </div>

          <div className="space-y-4 sm:col-span-2">
            <Input
              label="Exercise name"
              placeholder="Incline cable fly"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Or image URL"
              placeholder="https://..."
              hint="Optional if you uploaded a photo on the left"
              error={errors.imageUrl?.message}
              {...register('imageUrl')}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="primaryMuscle" className="block text-sm font-medium text-ink">
                  Primary muscle
                </label>
                <select
                  id="primaryMuscle"
                  className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
                  {...register('primaryMuscle')}
                >
                  {MUSCLE_GROUPS.map((m) => (
                    <option key={m} value={m}>
                      {formatLabel(m)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="equipment" className="block text-sm font-medium text-ink">
                  Equipment
                </label>
                <select
                  id="equipment"
                  className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
                  {...register('equipment')}
                >
                  {EQUIPMENT_TYPES.map((eq) => (
                    <option key={eq} value={eq}>
                      {formatLabel(eq)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="category" className="block text-sm font-medium text-ink">
              Category
            </label>
            <select
              id="category"
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
              {...register('category')}
            >
              {EXERCISE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {formatLabel(cat)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="difficulty" className="block text-sm font-medium text-ink">
              Difficulty
            </label>
            <select
              id="difficulty"
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
              {...register('difficulty')}
            >
              {DIFFICULTY_LEVELS.map((diff) => (
                <option key={diff} value={diff}>
                  {formatLabel(diff)}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Video or GIF URL (optional)"
            placeholder="https://..."
            error={errors.mediaUrl?.message}
            {...register('mediaUrl')}
          />
        </div>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">Secondary muscles</span>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.filter((m) => m !== watchedPrimaryMuscle && m !== 'cardio').map(
              (muscle) => {
                const active = secondaryMuscles.includes(muscle);
                return (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => toggleSecondaryMuscle(muscle)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      active
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line bg-surface text-ink-secondary hover:text-ink'
                    )}
                  >
                    {formatLabel(muscle)}
                  </button>
                );
              }
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="instructionsText" className="block text-sm font-medium text-ink">
              Instructions (one step per line)
            </label>
            <textarea
              id="instructionsText"
              rows={4}
              placeholder="Set bench to 30 degrees&#10;Lower dumbbells with elbows at 45 degrees"
              className="w-full rounded-lg border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-muted"
              {...register('instructionsText')}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="tipsText" className="block text-sm font-medium text-ink">
              Coaching cues (one per line)
            </label>
            <textarea
              id="tipsText"
              rows={4}
              placeholder="Keep shoulder blades retracted&#10;Control the 2-second eccentric"
              className="w-full rounded-lg border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-muted"
              {...register('tipsText')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Save changes' : 'Create exercise'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ExerciseFormModal;
