import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  CLIENT_GENDERS,
  CLIENT_GOALS,
  WEEKDAYS,
  formatDateInput,
  formatGender,
  formatGoal,
} from '../../lib/clients.api';
import { cn, getApiErrorMessage } from '../../lib/utils';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';

const clientSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  phone: z.string().trim().max(30).optional(),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email')
    .optional(),
  gender: z.enum(CLIENT_GENDERS),
  dateOfBirth: z.string().optional(),
  goal: z.enum(CLIENT_GOALS),
  status: z.enum(['active', 'inactive']),
  heightCm: z.string().optional(),
  startingWeightKg: z.string().optional(),
  targetWeightKg: z.string().optional(),
  targetBodyFatPct: z.string().optional(),
  targetWaistCm: z.string().optional(),
  membershipStart: z.string().optional(),
  membershipEnd: z.string().optional(),
  injuriesText: z.string().optional(),
  medicalNotes: z.string().max(2000).optional(),
  emergencyName: z.string().max(100).optional(),
  emergencyPhone: z.string().max(30).optional(),
  emergencyRelation: z.string().max(60).optional(),
  notes: z.string().max(5000).optional(),
});

export function ClientFormModal({ isOpen, onClose, initialClient = null, onSubmitForm }) {
  const isEditing = Boolean(initialClient);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [trainingDays, setTrainingDays] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      gender: 'prefer_not_to_say',
      dateOfBirth: '',
      goal: 'general_fitness',
      status: 'active',
      heightCm: '',
      startingWeightKg: '',
      targetWeightKg: '',
      targetBodyFatPct: '',
      targetWaistCm: '',
      membershipStart: '',
      membershipEnd: '',
      injuriesText: '',
      medicalNotes: '',
      emergencyName: '',
      emergencyPhone: '',
      emergencyRelation: '',
      notes: '',
    },
  });

  const watchedName = watch('name');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedFile(null);
    setRemovePhoto(false);
    if (initialClient) {
      reset({
        name: initialClient.name || '',
        phone: initialClient.phone || '',
        email: initialClient.email || '',
        gender: initialClient.gender || 'prefer_not_to_say',
        dateOfBirth: formatDateInput(initialClient.dateOfBirth),
        goal: initialClient.goal || 'general_fitness',
        status: initialClient.status || 'active',
        heightCm: initialClient.heightCm ?? '',
        startingWeightKg: initialClient.startingWeightKg ?? '',
        targetWeightKg: initialClient.targetWeightKg ?? '',
        targetBodyFatPct: initialClient.targetBodyFatPct ?? '',
        targetWaistCm: initialClient.targetWaistCm ?? '',
        membershipStart: formatDateInput(initialClient.membershipStart),
        membershipEnd: formatDateInput(initialClient.membershipEnd),
        injuriesText: (initialClient.injuries || []).join(', '),
        medicalNotes: initialClient.medicalNotes || '',
        emergencyName: initialClient.emergencyContact?.name || '',
        emergencyPhone: initialClient.emergencyContact?.phone || '',
        emergencyRelation: initialClient.emergencyContact?.relation || '',
        notes: initialClient.notes || '',
      });
      setPreviewUrl(initialClient.photoUrl || '');
      setTrainingDays(initialClient.preferredTrainingDays || []);
    } else {
      reset({
        name: '',
        phone: '',
        email: '',
        gender: 'prefer_not_to_say',
        dateOfBirth: '',
        goal: 'general_fitness',
        status: 'active',
        heightCm: '',
        startingWeightKg: '',
        targetWeightKg: '',
        targetBodyFatPct: '',
        targetWaistCm: '',
        membershipStart: '',
        membershipEnd: '',
        injuriesText: '',
        medicalNotes: '',
        emergencyName: '',
        emergencyPhone: '',
        emergencyRelation: '',
        notes: '',
      });
      setPreviewUrl('');
      setTrainingDays([]);
    }
  }, [isOpen, initialClient, reset]);

  useEffect(() => {
    if (!selectedFile) return undefined;
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be 5 MB or smaller');
      return;
    }
    setRemovePhoto(false);
    setSelectedFile(file);
  };

  const toggleDay = (dayVal) => {
    setTrainingDays((prev) =>
      prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal]
    );
  };

  const onSubmit = async (values) => {
    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('phone', values.phone || '');
    formData.append('email', values.email || '');
    formData.append('gender', values.gender);
    formData.append('dateOfBirth', values.dateOfBirth || '');
    formData.append('goal', values.goal);
    formData.append('status', values.status);
    formData.append('heightCm', String(values.heightCm ?? ''));
    formData.append('startingWeightKg', String(values.startingWeightKg ?? ''));
    formData.append('targetWeightKg', String(values.targetWeightKg ?? ''));
    formData.append('targetBodyFatPct', String(values.targetBodyFatPct ?? ''));
    formData.append('targetWaistCm', String(values.targetWaistCm ?? ''));
    formData.append('membershipStart', values.membershipStart || '');
    formData.append('membershipEnd', values.membershipEnd || '');
    formData.append('medicalNotes', values.medicalNotes || '');
    formData.append('notes', values.notes || '');

    const injuries = (values.injuriesText || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    formData.append('injuries', JSON.stringify(injuries));
    formData.append('preferredTrainingDays', JSON.stringify(trainingDays));
    formData.append(
      'emergencyContact',
      JSON.stringify({
        name: values.emergencyName || '',
        phone: values.emergencyPhone || '',
        relation: values.emergencyRelation || '',
      })
    );

    if (selectedFile) {
      formData.append('photo', selectedFile);
    } else if (removePhoto) {
      formData.append('removePhoto', 'true');
    }

    try {
      await onSubmitForm(formData, initialClient?.id);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save client'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit client' : 'Add client'}
      description="Store contact details, goals, baseline measurements, and medical notes"
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar src={removePhoto ? '' : previewUrl} name={watchedName || 'Client'} size="xl" />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-raised transition-colors">
              <Camera className="h-4 w-4" strokeWidth={1.75} />
              <span>{previewUrl && !removePhoto ? 'Change photo' : 'Upload photo'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            {previewUrl && !removePhoto && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl('');
                  setRemovePhoto(true);
                }}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                Remove
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Full name"
            placeholder="Rohan Sharma"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="space-y-1.5">
            <label htmlFor="goal" className="block text-sm font-medium text-ink">
              Primary goal
            </label>
            <select
              id="goal"
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
              {...register('goal')}
            >
              {CLIENT_GOALS.map((g) => (
                <option key={g} value={g}>
                  {formatGoal(g)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="status" className="block text-sm font-medium text-ink">
              Status
            </label>
            <select
              id="status"
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
              {...register('status')}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <Input
            label="Phone"
            placeholder="+91 98765 43210"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Email"
            type="email"
            placeholder="client@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="gender" className="block text-sm font-medium text-ink">
                Gender
              </label>
              <select
                id="gender"
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
                {...register('gender')}
              >
                {CLIENT_GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {formatGender(g)}
                  </option>
                ))}
              </select>
            </div>

            <Input label="Date of birth" type="date" {...register('dateOfBirth')} />
          </div>
        </div>

        <div className="space-y-2 border-t border-line pt-4">
          <h4 className="text-sm font-semibold text-ink">Body metrics and targets</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Input
              label="Height (cm)"
              type="number"
              step="0.1"
              placeholder="175"
              className="tabular-nums"
              {...register('heightCm')}
            />
            <Input
              label="Start weight (kg)"
              type="number"
              step="0.1"
              placeholder="80"
              className="tabular-nums"
              {...register('startingWeightKg')}
            />
            <Input
              label="Target weight (kg)"
              type="number"
              step="0.1"
              placeholder="72"
              className="tabular-nums"
              {...register('targetWeightKg')}
            />
            <Input
              label="Target body fat (%)"
              type="number"
              step="0.1"
              placeholder="15"
              className="tabular-nums"
              {...register('targetBodyFatPct')}
            />
            <Input
              label="Target waist (cm)"
              type="number"
              step="0.1"
              placeholder="82"
              className="tabular-nums"
              {...register('targetWaistCm')}
            />
          </div>
        </div>

        <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <div className="space-y-2">
            <span className="block text-sm font-medium text-ink">Preferred training days</span>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => {
                const active = trainingDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      'h-9 min-w-[46px] rounded-lg border px-3 text-xs font-medium transition-colors',
                      active
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line bg-surface text-ink-secondary hover:text-ink'
                    )}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Membership start" type="date" {...register('membershipStart')} />
            <Input label="Membership end" type="date" {...register('membershipEnd')} />
          </div>
        </div>

        <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <div className="space-y-3">
            <Input
              label="Injuries (comma separated)"
              placeholder="Left knee ACL rehab, mild shoulder impingement"
              {...register('injuriesText')}
            />
            <div className="space-y-1.5">
              <label htmlFor="medicalNotes" className="block text-sm font-medium text-ink">
                Medical notes
              </label>
              <textarea
                id="medicalNotes"
                rows={3}
                placeholder="Cleared for resistance training; avoid deep flexion under load"
                className="w-full rounded-lg border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-muted"
                {...register('medicalNotes')}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Emergency contact"
                placeholder="Name"
                {...register('emergencyName')}
              />
              <Input label="Phone" placeholder="Phone" {...register('emergencyPhone')} />
              <Input label="Relation" placeholder="Spouse" {...register('emergencyRelation')} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="notes" className="block text-sm font-medium text-ink">
                General trainer notes
              </label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Prefers morning sessions at 7:00 AM"
                className="w-full rounded-lg border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-muted"
                {...register('notes')}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Save changes' : 'Create client'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ClientFormModal;
