import { AlertTriangle, CalendarDays, Mail, Phone, ShieldAlert, User } from 'lucide-react';
import {
  formatGender,
  formatGoal,
  formatShortDate,
  getWeekdayShort,
} from '../../lib/clients.api';
import Card, { CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';

function MetricItem({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-canvas p-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

export function ClientOverviewTab({ client }) {
  const hasMedicalAlert = Boolean(client.medicalNotes || client.injuries?.length > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {hasMedicalAlert && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-warning">
                <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-ink">Medical notes and injuries</h3>
                {client.injuries?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {client.injuries.map((injury, idx) => (
                      <Badge key={idx} tone="warning">
                        {injury}
                      </Badge>
                    ))}
                  </div>
                )}
                {client.medicalNotes && (
                  <p className="text-sm leading-relaxed text-ink-secondary">
                    {client.medicalNotes}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card>
          <CardHeader
            title="Baseline metrics and targets"
            description="Starting physical profile and coaching targets"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricItem
              label="Age"
              value={client.age !== null ? `${client.age} yrs` : 'Not set'}
            />
            <MetricItem
              label="Height"
              value={client.heightCm !== null ? `${client.heightCm} cm` : 'Not set'}
            />
            <MetricItem
              label="Starting BMI"
              value={client.startingBmi !== null ? `${client.startingBmi}` : 'Not set'}
            />
            <MetricItem
              label="Starting weight"
              value={
                client.startingWeightKg !== null ? `${client.startingWeightKg} kg` : 'Not set'
              }
            />
            <MetricItem
              label="Target weight"
              value={client.targetWeightKg !== null ? `${client.targetWeightKg} kg` : 'Not set'}
            />
            <MetricItem
              label="Target body fat"
              value={
                client.targetBodyFatPct !== null ? `${client.targetBodyFatPct}%` : 'Not set'
              }
            />
            {client.targetWaistCm !== null && (
              <MetricItem label="Target waist" value={`${client.targetWaistCm} cm`} />
            )}
          </div>
        </Card>

        {client.notes && (
          <Card>
            <CardHeader title="Pinned trainer notes" />
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-secondary">
              {client.notes}
            </p>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Profile details" />
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2 text-ink-secondary">
                <User className="h-4 w-4" strokeWidth={1.75} />
                Gender
              </dt>
              <dd className="font-medium text-ink">{formatGender(client.gender)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-secondary">Goal</dt>
              <dd className="font-medium text-ink">{formatGoal(client.goal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-secondary">Date of birth</dt>
              <dd className="font-medium tabular-nums text-ink">
                {formatShortDate(client.dateOfBirth)}
              </dd>
            </div>
            {client.phone && (
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2 text-ink-secondary">
                  <Phone className="h-4 w-4" strokeWidth={1.75} />
                  Phone
                </dt>
                <dd className="font-mono text-xs text-ink">{client.phone}</dd>
              </div>
            )}
            {client.email && (
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2 text-ink-secondary">
                  <Mail className="h-4 w-4" strokeWidth={1.75} />
                  Email
                </dt>
                <dd className="truncate font-mono text-xs text-ink">{client.email}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Membership and days" />
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2 text-ink-secondary">
                <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
                Start
              </dt>
              <dd className="font-medium tabular-nums text-ink">
                {formatShortDate(client.membershipStart)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-secondary">End</dt>
              <dd className="font-medium tabular-nums text-ink">
                {formatShortDate(client.membershipEnd)}
              </dd>
            </div>
            <div className="pt-1">
              <dt className="mb-2 text-xs font-medium text-ink-muted">Preferred training days</dt>
              {client.preferredTrainingDays?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {client.preferredTrainingDays.map((day) => (
                    <Badge key={day} tone="accent">
                      {getWeekdayShort(day)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-muted">No days set yet</p>
              )}
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Emergency contact" />
          {client.emergencyContact?.name || client.emergencyContact?.phone ? (
            <div className="space-y-1.5 text-sm">
              <p className="flex items-center gap-2 font-medium text-ink">
                <ShieldAlert className="h-4 w-4 text-ink-secondary" strokeWidth={1.75} />
                {client.emergencyContact.name || 'Unnamed contact'}
              </p>
              {client.emergencyContact.relation && (
                <p className="text-xs text-ink-secondary">{client.emergencyContact.relation}</p>
              )}
              {client.emergencyContact.phone && (
                <p className="font-mono text-xs text-ink">{client.emergencyContact.phone}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No emergency contact recorded</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default ClientOverviewTab;
