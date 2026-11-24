import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function slugifyFilePart(value, fallback = 'export') {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || fallback;
}

function drawDocumentHeader(doc, { title, subtitle, trainerName, gymName }) {
  doc.setFillColor(201, 82, 29);
  doc.rect(0, 0, 210, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(24, 24, 27);
  doc.text(title, 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(82, 82, 91);
  if (subtitle) {
    doc.text(subtitle, 14, 24);
  }

  const brandLine = [gymName, trainerName].filter(Boolean).join(' · ') || 'TrainerDesk';
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122);
  doc.text(`${brandLine}  |  Generated ${new Date().toISOString().slice(0, 10)}`, 14, 30);

  doc.setDrawColor(228, 228, 231);
  doc.line(14, 34, 196, 34);
  return 40;
}

function addPageFooters(doc) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(`TrainerDesk Report — Page ${i} of ${pageCount}`, 14, 289);
  }
}

export function exportClientProgressPdf({ client, trainer, measurements = [], analytics }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const goalLabel = String(client?.goal || 'general_fitness').replace(/_/g, ' ');

  let cursorY = drawDocumentHeader(doc, {
    title: `${client?.name || 'Client'} — Progress Report`,
    subtitle: `Goal: ${goalLabel}  ·  Status: ${client?.status || 'active'}`,
    trainerName: trainer?.name,
    gymName: trainer?.gymName,
  });

  const latestWeightEntry = [...measurements].reverse().find((m) => m.weightKg != null);
  const currentWeight = latestWeightEntry?.weightKg ?? client?.startingWeightKg ?? null;
  const startWeight = client?.startingWeightKg ?? measurements[0]?.weightKg ?? null;
  const weightDelta =
    currentWeight != null && startWeight != null
      ? Math.round((currentWeight - startWeight) * 10) / 10
      : null;

  const attendancePct = analytics?.attendance?.attendanceRatePct;
  const completedSessions = analytics?.attendance?.completed ?? 0;
  const totalActionable = analytics?.attendance?.totalActionable ?? 0;
  const totalPrs = analytics?.attendance?.totalPRs ?? 0;

  autoTable(doc, {
    startY: cursorY,
    head: [['Metric', 'Value', 'Detail']],
    body: [
      [
        'Current weight',
        currentWeight != null ? `${currentWeight} kg` : '—',
        weightDelta != null
          ? `${weightDelta > 0 ? '+' : ''}${weightDelta} kg vs start`
          : 'No weight delta yet',
      ],
      [
        'Target weight',
        client?.targetWeightKg != null ? `${client.targetWeightKg} kg` : 'Not set',
        client?.heightCm != null ? `Height ${client.heightCm} cm` : '—',
      ],
      [
        'Session attendance',
        attendancePct != null ? `${attendancePct}%` : '—',
        `${completedSessions} completed / ${totalActionable} completed + missed`,
      ],
      ['Personal records', `${totalPrs}`, 'Logged across completed sessions'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [24, 24, 27], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [39, 39, 42] },
    margin: { left: 14, right: 14 },
  });

  cursorY = doc.lastAutoTable.finalY + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(24, 24, 27);
  doc.text('Body Measurements Log', 14, cursorY);
  cursorY += 3;

  if (measurements.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [['Date', 'Weight (kg)', 'Body Fat %', 'Waist (cm)', 'Chest (cm)', 'Arms (cm)', 'Notes']],
      body: [...measurements]
        .reverse()
        .slice(0, 30)
        .map((m) => [
          m.date || '',
          m.weightKg ?? '—',
          m.bodyFatPct ?? '—',
          m.waistCm ?? '—',
          m.chestCm ?? '—',
          m.armsCm ?? '—',
          (m.notes || '').slice(0, 45),
        ]),
      theme: 'striped',
      headStyles: { fillColor: [201, 82, 29], textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5, textColor: [39, 39, 42] },
      margin: { left: 14, right: 14 },
    });
    cursorY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(113, 113, 122);
    doc.text('No body measurements recorded yet.', 14, cursorY + 5);
    cursorY += 12;
  }

  const exercises = analytics?.strengthProgression || [];
  if (exercises.length > 0) {
    if (cursorY > 235) {
      doc.addPage();
      cursorY = 18;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(24, 24, 27);
    doc.text('Strength Progression (Estimated 1RM)', 14, cursorY);
    cursorY += 3;

    autoTable(doc, {
      startY: cursorY,
      head: [['Exercise', 'Latest Est 1RM', 'Best Est 1RM', 'Latest Max Weight', 'Sessions']],
      body: exercises.slice(0, 15).map((ex) => [
        ex.exerciseName,
        ex.latestEst1RM ? `${ex.latestEst1RM} kg` : '—',
        ex.bestEst1RM ? `${ex.bestEst1RM} kg` : '—',
        ex.latestMaxWeight ? `${ex.latestMaxWeight} kg` : '—',
        String(ex.sessionCount || ex.points?.length || 0),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [24, 24, 27], textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5, textColor: [39, 39, 42] },
      margin: { left: 14, right: 14 },
    });
  }

  addPageFooters(doc);
  const fileName = `${slugifyFilePart(client?.name, 'client')}-progress-report.pdf`;
  doc.save(fileName);
}

export function exportDietPlanPdf({ plan, clientName, trainer }) {
  if (!plan) return;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const resolvedClientName = clientName || plan.clientName;
  let cursorY = drawDocumentHeader(doc, {
    title: plan.name || 'Diet Plan',
    subtitle: `${resolvedClientName ? `Client: ${resolvedClientName}  ·  ` : ''}Meal Schedule`,
    trainerName: trainer?.name || plan.trainerName,
    gymName: trainer?.gymName || plan.gymName,
  });

  const totals = plan.dailyTotals || {};
  const targets = plan.targets || {};

  autoTable(doc, {
    startY: cursorY,
    head: [['Daily Macro', 'Planned Total', 'Daily Target']],
    body: [
      ['Calories', `${Math.round(totals.calories || 0)} kcal`, `${targets.calories ?? '—'} kcal`],
      ['Protein', `${Math.round(totals.protein || 0)} g`, `${targets.protein ?? '—'} g`],
      ['Carbohydrates', `${Math.round(totals.carbs || 0)} g`, `${targets.carbs ?? '—'} g`],
      ['Fats', `${Math.round(totals.fat || 0)} g`, `${targets.fat ?? '—'} g`],
      ['Water target', `${targets.waterLiters ?? 3} L / day`, 'Daily hydration'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [24, 24, 27], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [39, 39, 42] },
    margin: { left: 14, right: 14 },
  });

  cursorY = doc.lastAutoTable.finalY + 8;

  for (const meal of plan.meals || []) {
    if (cursorY > 240) {
      doc.addPage();
      cursorY = 18;
    }

    const mealTotals = meal.mealTotals || {};
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(24, 24, 27);
    doc.text(
      `${meal.name || 'Meal'}${meal.time ? ` (${meal.time})` : ''} — ${Math.round(
        mealTotals.calories || 0
      )} kcal`,
      14,
      cursorY
    );
    cursorY += 2.5;

    const rows = (meal.items || []).map((item) => {
      const m = item.computedMacros || {};
      const qtyStr = item.gramsEquivalent
        ? `${item.quantity} ${item.measure} (${Math.round(item.gramsEquivalent)}g)`
        : `${item.quantity} ${item.measure}`;
      return [
        item.foodName || 'Food',
        qtyStr,
        `${Math.round(m.calories || 0)}`,
        `${Math.round(m.protein || 0)}g`,
        `${Math.round(m.carbs || 0)}g`,
        `${Math.round(m.fat || 0)}g`,
      ];
    });

    autoTable(doc, {
      startY: cursorY,
      head: [['Food Item', 'Measure', 'Kcal', 'Protein', 'Carbs', 'Fat']],
      body:
        rows.length > 0 ? rows : [['No items logged for this meal', '—', '0', '0g', '0g', '0g']],
      theme: 'striped',
      headStyles: { fillColor: [201, 82, 29], textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5, textColor: [39, 39, 42] },
      margin: { left: 14, right: 14 },
    });

    cursorY = doc.lastAutoTable.finalY + 6;
  }

  const supplements = Array.isArray(plan.supplements) ? plan.supplements : [];
  if (supplements.length > 0 || plan.notes) {
    if (cursorY > 245) {
      doc.addPage();
      cursorY = 18;
    }
    if (supplements.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(24, 24, 27);
      doc.text('Supplements', 14, cursorY);
      cursorY += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      for (const sup of supplements) {
        const line = [sup.name, sup.dosage, sup.timing ? `(${sup.timing})` : '']
          .filter(Boolean)
          .join(' ');
        doc.text(`• ${line}`, 14, cursorY);
        cursorY += 4.5;
      }
      cursorY += 2;
    }
    if (plan.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(24, 24, 27);
      doc.text('Coach Notes', 14, cursorY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const wrapped = doc.splitTextToSize(plan.notes, 182);
      doc.text(wrapped, 14, cursorY + 5);
    }
  }

  addPageFooters(doc);
  const fileName = `${slugifyFilePart(resolvedClientName || plan.name, 'diet-plan')}-diet-plan.pdf`;
  doc.save(fileName);
}
