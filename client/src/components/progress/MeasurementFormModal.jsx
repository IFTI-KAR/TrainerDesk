import { useEffect, useState } from 'react';
import { getTodayDateStr } from '../../lib/schedule.api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

const CIRCUMFERENCE_FIELDS = [
  { key: 'waistCm', label: 'Waist (cm)' },
  { key: 'chestCm', label: 'Chest (cm)' },
  { key: 'hipsCm', label: 'Hips (cm)' },
  { key: 'armsCm', label: 'Arms (cm)' },
  { key: 'thighsCm', label: 'Thighs (cm)' },
  { key: 'calvesCm', label: 'Calves (cm)' },
  { key: 'neckCm', label: 'Neck (cm)' },
  { key: 'shouldersCm', label: 'Shoulders (cm)' },
];

export function MeasurementFormModal({
  isOpen,
  onClose,
  client,
  initialMeasurement = null,
  onSubmitForm,
  isSaving = false,
}) {
  const isEditing = Boolean(initialMeasurement);
  const [date, setDate] = useState(getTodayDateStr());
  const [weightKg, setWeightKg] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [circumferences, setCircumferences] = useState({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialMeasurement) {
      setDate(initialMeasurement.date || getTodayDateStr());
      setWeightKg(initialMeasurement.weightKg ?? '');
      setBodyFatPct(initialMeasurement.bodyFatPct ?? '');
      const circ = {};
      for (const f of CIRCUMFERENCE_FIELDS) {
        circ[f.key] = initialMeasurement[f.key] ?? '';
      }
      setCircumferences(circ);
      setNotes(initialMeasurement.notes || '');
    } else {
      setDate(getTodayDateStr());
      setWeightKg('');
      setBodyFatPct('');
      setCircumferences({});
      setNotes('');
    }
  }, [isOpen, initialMeasurement]);

  const liveBmi =
    weightKg && client?.heightCm
      ? Math.round((Number(weightKg) / ((client.heightCm / 100) ** 2)) * 10) / 10
      : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...(isEditing ? {} : { clientId: client.id }),
      date,
      weightKg: weightKg === '' ? null : Number(weightKg),
      bodyFatPct: bodyFatPct === '' ? null : Number(bodyFatPct),
      notes,
    };
    for (const f of CIRCUMFERENCE_FIELDS) {
      const raw = circumferences[f.key];
      payload[f.key] = raw === '' || raw === undefined ? null : Number(raw);
    }
    onSubmitForm(payload, initialMeasurement?.id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit measurement' : 'Log body measurements'}
      description="BMI is calculated automatically from the client's height"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Weight (kg)"
            type="number"
            step="0.1"
            min="20"
            max="350"
            placeholder="78.5"
            className="tabular-nums"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
          <Input
            label="Body fat (%)"
            type="number"
            step="0.1"
            min="2"
            max="75"
            placeholder="18.5"
            className="tabular-nums"
            value={bodyFatPct}
            onChange={(e) => setBodyFatPct(e.target.value)}
          />
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-ink">Auto BMI</span>
            <div className="flex h-11 items-center rounded-lg border border-line bg-surface-raised px-3 font-mono text-sm tabular-nums text-ink">
              {liveBmi !== null ? liveBmi : '—'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CIRCUMFERENCE_FIELDS.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              type="number"
              step="0.1"
              min="10"
              max="250"
              className="tabular-nums"
              value={circumferences[field.key] ?? ''}
              onChange={(e) =>
                setCircumferences((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
            />
          ))}
        </div>

        <Input
          label="Notes (optional)"
          placeholder="Morning fasted check-in"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {isEditing ? 'Save changes' : 'Save measurement'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default MeasurementFormModal;
