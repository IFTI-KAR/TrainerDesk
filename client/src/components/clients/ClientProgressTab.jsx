import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Download, Pencil, Plus, Ruler, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { exportClientProgressPdf } from '../../lib/pdfExport';
import {
  PHOTO_POSES,
  createMeasurement,
  deleteMeasurement,
  deleteProgressPhoto,
  fetchClientProgress,
  updateMeasurement,
  uploadProgressPhoto,
} from '../../lib/progress.api';
import { cn, getApiErrorMessage } from '../../lib/utils';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card, { CardHeader } from '../ui/Card';
import ConfirmDialog from '../ui/ConfirmDialog';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import GoalProgressCards from '../progress/GoalProgressCards';
import BodyMetricsChart from '../progress/BodyMetricsChart';
import StrengthProgressionChart from '../progress/StrengthProgressionChart';
import ConsistencyHeatmap from '../progress/ConsistencyHeatmap';
import PhotoCompareSlider from '../progress/PhotoCompareSlider';
import MeasurementFormModal from '../progress/MeasurementFormModal';
import PhotoUploadModal from '../progress/PhotoUploadModal';

export function ClientProgressTab({ client }) {
  const { trainer } = useAuth();
  const queryClient = useQueryClient();

  const [isMeasurementOpen, setIsMeasurementOpen] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState(null);
  const [deletingMeasurement, setDeletingMeasurement] = useState(null);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [galleryPoseFilter, setGalleryPoseFilter] = useState('all');
  const [deletingPhoto, setDeletingPhoto] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['progress', client.id],
    queryFn: () => fetchClientProgress(client.id),
  });

  const invalidateProgress = () => {
    queryClient.invalidateQueries({ queryKey: ['progress', client.id] });
  };

  const saveMeasurementMutation = useMutation({
    mutationFn: ({ payload, editId }) =>
      editId ? updateMeasurement({ id: editId, payload }) : createMeasurement(payload),
    onSuccess: (_res, vars) => {
      invalidateProgress();
      setIsMeasurementOpen(false);
      setEditingMeasurement(null);
      toast.success(vars.editId ? 'Measurement updated' : 'Measurement logged');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save measurement')),
  });

  const deleteMeasurementMutation = useMutation({
    mutationFn: deleteMeasurement,
    onSuccess: () => {
      invalidateProgress();
      setDeletingMeasurement(null);
      toast.success('Measurement deleted');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to delete measurement')),
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: uploadProgressPhoto,
    onSuccess: () => {
      invalidateProgress();
      setIsPhotoModalOpen(false);
      toast.success('Progress photo uploaded');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to upload photo')),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: deleteProgressPhoto,
    onSuccess: () => {
      invalidateProgress();
      setDeletingPhoto(null);
      toast.success('Photo deleted');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to delete photo')),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const measurements = data?.measurements || [];
  const photos = data?.photos || [];
  const analytics = data?.analytics || {};

  const filteredPhotos =
    galleryPoseFilter === 'all'
      ? photos
      : photos.filter((p) => p.pose === galleryPoseFilter);

  const reversedMeasurements = measurements.slice().reverse();

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Progress tracking</h2>
          <p className="text-sm text-ink-secondary">
            Body measurements, strength 1RM progression, attendance, and progress photos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportClientProgressPdf({ client, trainer, measurements, analytics });
              toast.success('Progress PDF downloaded');
            }}
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsPhotoModalOpen(true)}>
            <Camera className="h-4 w-4" strokeWidth={1.75} />
            Upload photo
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingMeasurement(null);
              setIsMeasurementOpen(true);
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Log measurement
          </Button>
        </div>
      </div>

      {/* Goal Progress Bars */}
      <GoalProgressCards goals={analytics.goals} />

      {/* Main Body Metrics Trend Chart */}
      <BodyMetricsChart measurements={measurements} client={client} />

      {/* Strength Progression + Attendance Consistency */}
      <div className="grid gap-6 lg:grid-cols-2">
        <StrengthProgressionChart strengthProgression={analytics.strengthProgression} />
        <ConsistencyHeatmap
          attendance={analytics.attendance}
          heatmap={analytics.consistencyHeatmap}
        />
      </div>

      {/* Before / After Comparison Slider */}
      <PhotoCompareSlider photos={photos} />

      {/* Photo Gallery */}
      <Card>
        <CardHeader
          title="Progress photo gallery"
          description={`${photos.length} photos stored`}
          action={
            <div className="flex items-center gap-1 rounded-lg border border-line bg-canvas p-0.5">
              {['all', ...PHOTO_POSES].map((pose) => (
                <button
                  key={pose}
                  type="button"
                  onClick={() => setGalleryPoseFilter(pose)}
                  className={cn(
                    'h-7 rounded-md px-2.5 text-xs font-medium capitalize transition-colors',
                    galleryPoseFilter === pose
                      ? 'bg-surface-raised text-ink'
                      : 'text-ink-secondary hover:text-ink'
                  )}
                >
                  {pose}
                </button>
              ))}
            </div>
          }
        />

        {filteredPhotos.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="No progress photos yet"
            description="Upload front, side, and back check-in photos to track visual transformation."
            action={
              <Button size="sm" variant="outline" onClick={() => setIsPhotoModalOpen(true)}>
                Upload first photo
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-xl border border-line bg-canvas"
              >
                <div className="aspect-[3/4] w-full bg-surface-raised">
                  <img
                    src={photo.imageUrl}
                    alt={`${photo.pose} ${photo.date}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 p-2.5">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-medium text-ink tabular-nums">
                      {photo.date}
                    </p>
                    <p className="text-[11px] capitalize text-ink-secondary">
                      {photo.pose}
                      {photo.weightKg ? ` · ${photo.weightKg} kg` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeletingPhoto(photo)}
                    aria-label="Delete photo"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-raised hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Measurement History Table */}
      <Card>
        <CardHeader
          title="Measurement history"
          description="Chronological log of body weight, BMI, body fat, and circumferences"
        />

        {reversedMeasurements.length === 0 ? (
          <EmptyState
            icon={Ruler}
            title="No measurements logged yet"
            description="Record weight, waist, chest, arms, and body fat over time."
            action={
              <Button size="sm" variant="outline" onClick={() => setIsMeasurementOpen(true)}>
                Log first measurement
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-medium text-ink-muted">
                  <th className="py-2.5 pr-4">Date</th>
                  <th className="py-2.5 px-3">Weight</th>
                  <th className="py-2.5 px-3">BMI</th>
                  <th className="py-2.5 px-3">BF %</th>
                  <th className="py-2.5 px-3">Waist</th>
                  <th className="py-2.5 px-3">Chest</th>
                  <th className="py-2.5 px-3">Arms</th>
                  <th className="py-2.5 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-mono text-xs tabular-nums">
                {reversedMeasurements.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-raised/50">
                    <td className="py-3 pr-4 font-medium text-ink">
                      {m.date}
                      {m.notes && (
                        <Badge tone="neutral" className="ml-2 font-sans">
                          Note
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 text-ink">
                      {m.weightKg !== null ? `${m.weightKg} kg` : '—'}
                    </td>
                    <td className="py-3 px-3 text-ink-secondary">{m.bmi ?? '—'}</td>
                    <td className="py-3 px-3 text-ink-secondary">
                      {m.bodyFatPct !== null ? `${m.bodyFatPct}%` : '—'}
                    </td>
                    <td className="py-3 px-3 text-ink-secondary">
                      {m.waistCm !== null ? `${m.waistCm} cm` : '—'}
                    </td>
                    <td className="py-3 px-3 text-ink-secondary">
                      {m.chestCm !== null ? `${m.chestCm} cm` : '—'}
                    </td>
                    <td className="py-3 px-3 text-ink-secondary">
                      {m.armsCm !== null ? `${m.armsCm} cm` : '—'}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMeasurement(m);
                            setIsMeasurementOpen(true);
                          }}
                          aria-label="Edit measurement"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-raised hover:text-ink"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingMeasurement(m)}
                          aria-label="Delete measurement"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <MeasurementFormModal
        isOpen={isMeasurementOpen}
        onClose={() => {
          setIsMeasurementOpen(false);
          setEditingMeasurement(null);
        }}
        client={client}
        initialMeasurement={editingMeasurement}
        isSaving={saveMeasurementMutation.isPending}
        onSubmitForm={(payload, editId) =>
          saveMeasurementMutation.mutate({ payload, editId })
        }
      />

      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        clientId={client.id}
        isUploading={uploadPhotoMutation.isPending}
        onUpload={(formData) => uploadPhotoMutation.mutate(formData)}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingMeasurement)}
        onClose={() => setDeletingMeasurement(null)}
        onConfirm={() =>
          deletingMeasurement && deleteMeasurementMutation.mutate(deletingMeasurement.id)
        }
        title="Delete measurement"
        description={`Delete measurement entry for ${deletingMeasurement?.date}?`}
        confirmLabel="Delete"
        isLoading={deleteMeasurementMutation.isPending}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingPhoto)}
        onClose={() => setDeletingPhoto(null)}
        onConfirm={() => deletingPhoto && deletePhotoMutation.mutate(deletingPhoto.id)}
        title="Delete progress photo"
        description={`Delete ${deletingPhoto?.pose} photo from ${deletingPhoto?.date}?`}
        confirmLabel="Delete photo"
        isLoading={deletePhotoMutation.isPending}
      />
    </div>
  );
}

export default ClientProgressTab;
