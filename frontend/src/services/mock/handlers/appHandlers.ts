import type { MockRoute } from '../engine';

interface MockTask {
  id: string;
  patientId: string;
  title: string;
  description?: string;
  dueAt: string;
  recurrence: string;
  priority: string;
  status: string;
  createdAt: string;
}

interface MockSchedule {
  id: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  recurrence: { frequency: string; times: string[]; daysOfWeek?: number[] };
  timezone: string;
  startAt: string;
  endAt?: string | null;
  active: boolean;
  prescribedBy?: string;
  reminderPreferences?: { enabled: boolean; advanceMinutes: number; channels: string[] };
  createdAt: string;
}

interface MockAppointment {
  id: string;
  patientId: string;
  provider: string;
  specialty?: string;
  startsAt: string;
  endsAt?: string;
  timezone: string;
  location: string;
  status: string;
  notes?: string;
  createdAt: string;
}

interface MockRecord {
  id: string;
  patientId: string;
  recordType: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedBy: { displayName: string; role: string };
  notes?: string;
  createdAt: string;
}

interface MockReading {
  id: string;
  patientId: string;
  type: string;
  value: number;
  unit: string;
  measuredAt: string;
  source?: string;
  notes?: string;
  createdAt?: string;
}

interface MockCheckIn {
  id: string;
  patientId: string;
  appointmentId?: string;
  feeling: string;
  painScore: number;
  symptoms: string[];
  notes?: string;
  respondentType: string;
  createdAt: string;
}

interface MockRelationship {
  id: string;
  patientId: {
    id: string;
    displayName: string;
    email?: string;
    phone?: string;
    timezone?: string;
    role: string;
  };
  caregiverId: {
    id: string;
    displayName: string;
    email?: string;
    phone?: string;
    timezone?: string;
    role: string;
  };
  permissions: string[];
  relationshipType: string;
  consentStatus: string;
  notes?: string;
  createdAt: string;
}

interface MockAuditEvent {
  id: string;
  actorId: { displayName: string; role: string };
  patientId: string;
  action: string;
  targetType: string;
  result: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// Mock in-memory state for dev and testing
const initialTasks: MockTask[] = [
  {
    id: 'tsk_1',
    patientId: 'pat_raghav',
    title: 'Morning blood pressure check',
    description: 'Use the upper-arm cuff before breakfast. Note systolic & diastolic.',
    dueAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    recurrence: 'daily',
    priority: 'high',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tsk_2',
    patientId: 'pat_raghav',
    title: 'Hydration reminder (2 glasses)',
    description: 'Encourage warm water or herbal infusion.',
    dueAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    recurrence: 'daily',
    priority: 'medium',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tsk_3',
    patientId: 'pat_raghav',
    title: 'Evening light walk (15 mins)',
    description: 'Garden stroll with walking cane support.',
    dueAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    recurrence: 'daily',
    priority: 'low',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];

const initialSchedules: MockSchedule[] = [
  {
    id: 'med_1',
    patientId: 'pat_raghav',
    medicationName: 'Amlodipine Besylate',
    dosage: '5mg (1 tablet)',
    instructions: 'Take 1 tablet daily in the morning with water.',
    recurrence: {
      frequency: 'daily',
      times: ['08:30'],
    },
    timezone: 'Asia/Kolkata',
    startAt: '2026-01-01T00:00:00.000Z',
    endAt: null,
    active: true,
    prescribedBy: 'Dr. V. K. Sharma (Cardiology)',
    reminderPreferences: {
      enabled: true,
      advanceMinutes: 15,
      channels: ['push', 'voice_sarvam'],
    },
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'med_2',
    patientId: 'pat_raghav',
    medicationName: 'Metformin Hydrochloride',
    dosage: '500mg (1 tablet)',
    instructions: 'Take with or immediately after evening meal.',
    recurrence: {
      frequency: 'daily',
      times: ['19:30'],
    },
    timezone: 'Asia/Kolkata',
    startAt: '2026-01-01T00:00:00.000Z',
    endAt: null,
    active: true,
    prescribedBy: 'Dr. Anita Sen (Endocrinology)',
    reminderPreferences: {
      enabled: true,
      advanceMinutes: 15,
      channels: ['push'],
    },
    createdAt: '2026-01-01T08:00:00.000Z',
  },
];

const initialAppointments: MockAppointment[] = [
  {
    id: 'apt_1',
    patientId: 'pat_raghav',
    provider: 'Dr. V. K. Sharma',
    specialty: 'Cardiologist',
    startsAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 49 * 3600 * 1000).toISOString(),
    timezone: 'Asia/Kolkata',
    location: 'Care Heart Clinic, Room 302, MG Road, Bengaluru',
    status: 'scheduled',
    notes: 'Routine hypertension follow-up and ECG review.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'apt_2',
    patientId: 'pat_raghav',
    provider: 'Dr. Rajeshwari Joshi',
    specialty: 'Physical Therapist',
    startsAt: new Date(Date.now() + 120 * 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 121 * 3600 * 1000).toISOString(),
    timezone: 'Asia/Kolkata',
    location: 'Home Visit Consultation',
    status: 'scheduled',
    notes: 'Knee mobility and balance exercise assessment.',
    createdAt: new Date().toISOString(),
  },
];

const initialRecords: MockRecord[] = [
  {
    id: 'rec_1',
    patientId: 'pat_raghav',
    recordType: 'lab_result',
    fileName: 'lipid_panel_q3.pdf',
    contentType: 'application/pdf',
    fileSizeBytes: 245120,
    uploadedBy: { displayName: 'Anita Rao', role: 'caregiver' },
    notes: 'Fasting lipid profile — cholesterol levels stable.',
    createdAt: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
  },
  {
    id: 'rec_2',
    patientId: 'pat_raghav',
    recordType: 'prescription',
    fileName: 'prescription_cardio_2026.pdf',
    contentType: 'application/pdf',
    fileSizeBytes: 128450,
    uploadedBy: { displayName: 'Dr. V. K. Sharma', role: 'provider' },
    notes: 'Updated Amlodipine dosage prescription.',
    createdAt: new Date(Date.now() - 10 * 86400 * 1000).toISOString(),
  },
];

const initialReadings: MockReading[] = [
  {
    id: 'rdg_1',
    patientId: 'pat_raghav',
    type: 'blood_pressure_systolic',
    value: 128,
    unit: 'mmHg',
    measuredAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    source: 'caregiver_entry',
    notes: 'Morning rest reading.',
  },
  {
    id: 'rdg_2',
    patientId: 'pat_raghav',
    type: 'blood_pressure_diastolic',
    value: 82,
    unit: 'mmHg',
    measuredAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    source: 'caregiver_entry',
    notes: 'Morning rest reading.',
  },
  {
    id: 'rdg_3',
    patientId: 'pat_raghav',
    type: 'heart_rate',
    value: 72,
    unit: 'bpm',
    measuredAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    source: 'caregiver_entry',
  },
  {
    id: 'rdg_4',
    patientId: 'pat_raghav',
    type: 'blood_glucose',
    value: 104,
    unit: 'mg/dL',
    measuredAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    source: 'caregiver_entry',
    notes: 'Fasting glucose level.',
  },
];

const initialCheckIns: MockCheckIn[] = [
  {
    id: 'chk_1',
    patientId: 'pat_raghav',
    feeling: 'good',
    painScore: 2,
    symptoms: ['Mild knee stiffness'],
    notes: 'Slept well, appetite is good.',
    respondentType: 'patient',
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
];

const initialRelationships: MockRelationship[] = [
  {
    id: 'rel_1',
    patientId: {
      id: 'pat_raghav',
      displayName: 'Raghav Rao',
      email: 'raghav.rao@carecircle.test',
      phone: '+91 98450 12345',
      timezone: 'Asia/Kolkata',
      role: 'patient',
    },
    caregiverId: {
      id: 'usr_demo',
      displayName: 'Anita Rao',
      email: 'demo@carecircle.test',
      phone: '+91 98765 43210',
      timezone: 'Asia/Kolkata',
      role: 'caregiver',
    },
    permissions: ['all'],
    relationshipType: 'Daughter / Primary Caregiver',
    consentStatus: 'active',
    notes: 'Primary coordinator for medications, doctor visits, and daily checks.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rel_2',
    patientId: {
      id: 'pat_raghav',
      displayName: 'Raghav Rao',
      email: 'raghav.rao@carecircle.test',
      phone: '+91 98450 12345',
      timezone: 'Asia/Kolkata',
      role: 'patient',
    },
    caregiverId: {
      id: 'usr_vikram',
      displayName: 'Vikram Rao',
      email: 'vikram.rao@carecircle.test',
      phone: '+91 98451 98765',
      timezone: 'Asia/Kolkata',
      role: 'caregiver',
    },
    permissions: ['manage_appointments', 'receive_alerts', 'view_records'],
    relationshipType: 'Son',
    consentStatus: 'active',
    notes: 'Assists with weekend clinic drives and emergency alerts.',
    createdAt: '2026-01-05T00:00:00.000Z',
  },
];

const initialAuditEvents: MockAuditEvent[] = [
  {
    id: 'aud_1',
    actorId: { displayName: 'Anita Rao', role: 'caregiver' },
    patientId: 'pat_raghav',
    action: 'DOSE_CONFIRMED',
    targetType: 'medication_dose',
    result: 'SUCCESS',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    metadata: { medication: 'Amlodipine Besylate', doseStatus: 'taken' },
  },
  {
    id: 'aud_2',
    actorId: { displayName: 'Anita Rao', role: 'caregiver' },
    patientId: 'pat_raghav',
    action: 'HEALTH_READING_RECORDED',
    targetType: 'health_reading',
    result: 'SUCCESS',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    metadata: { type: 'blood_pressure', systolic: 128, diastolic: 82 },
  },
  {
    id: 'aud_3',
    actorId: { displayName: 'System', role: 'system' },
    patientId: 'pat_raghav',
    action: 'APPOINTMENT_REMINDER_QUEUED',
    targetType: 'appointment',
    result: 'SUCCESS',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    metadata: { provider: 'Dr. V. K. Sharma' },
  },
];

export const appMockRoutes: readonly MockRoute[] = [
  // Auth profile
  {
    method: 'GET',
    pattern: '/auth/me',
    requiresSession: true,
    handle: () => ({
      status: 200,
      body: {
        user: {
          id: 'usr_demo',
          displayName: 'Anita Rao',
          email: 'demo@carecircle.test',
          role: 'caregiver',
          timeZone: 'Asia/Kolkata',
          phone: '+91 98765 43210',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        circle: {
          id: 'cir_demo',
          name: 'Rao family circle',
          recipientName: 'Raghav Rao',
          role: 'Primary caregiver',
        },
      },
    }),
  },

  // Tasks
  {
    method: 'GET',
    pattern: '/tasks',
    requiresSession: true,
    handle: () => ({ status: 200, body: { data: initialTasks, tasks: initialTasks } }),
  },
  {
    method: 'POST',
    pattern: '/tasks',
    requiresSession: true,
    handle: (req) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const newTask: MockTask = {
        id: `tsk_${Date.now()}`,
        patientId: String(b.patientId || 'pat_raghav'),
        title: String(b.title || 'Untitled task'),
        description: b.description ? String(b.description) : '',
        dueAt: String(b.dueAt || new Date().toISOString()),
        recurrence: String(b.recurrence || 'none'),
        priority: String(b.priority || 'medium'),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      initialTasks.unshift(newTask);
      return { status: 201, body: { task: newTask, data: { task: newTask } } };
    },
  },
  {
    method: 'PATCH',
    pattern: '/tasks/:id',
    requiresSession: true,
    handle: (req) => {
      const id = req.params.id;
      const task = initialTasks.find((t) => t.id === id);
      if (!task) return { status: 404, body: { code: 'not_found' } };
      const b = (req.body ?? {}) as Record<string, unknown>;
      Object.assign(task, b);
      return { status: 200, body: { task, data: { task } } };
    },
  },

  // Medications
  {
    method: 'GET',
    pattern: '/medications/schedule',
    requiresSession: true,
    handle: () => ({
      status: 200,
      body: { schedules: initialSchedules, data: { schedules: initialSchedules } },
    }),
  },
  {
    method: 'POST',
    pattern: '/medications/schedule',
    requiresSession: true,
    handle: (req) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const newMed: MockSchedule = {
        id: `med_${Date.now()}`,
        patientId: String(b.patientId || 'pat_raghav'),
        medicationName: String(b.medicationName || 'Medication'),
        dosage: String(b.dosage || '1 dose'),
        instructions: String(b.instructions || 'As prescribed'),
        recurrence: (b.recurrence as { frequency: string; times: string[] }) || {
          frequency: 'daily',
          times: ['08:30'],
        },
        timezone: 'Asia/Kolkata',
        startAt: String(b.startAt || new Date().toISOString()),
        active: true,
        createdAt: new Date().toISOString(),
      };
      initialSchedules.unshift(newMed);
      return { status: 201, body: { schedule: newMed, data: { schedule: newMed } } };
    },
  },
  {
    method: 'PATCH',
    pattern: '/medications/schedule/:id',
    requiresSession: true,
    handle: (req) => {
      const id = req.params.id;
      const med = initialSchedules.find((m) => m.id === id);
      if (!med) return { status: 404, body: { code: 'not_found' } };
      Object.assign(med, req.body);
      return { status: 200, body: { schedule: med, data: { schedule: med } } };
    },
  },
  {
    method: 'POST',
    pattern: '/medications/doses/confirm',
    requiresSession: true,
    handle: (req) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      return {
        status: 200,
        body: {
          doseConfirmation: {
            id: `conf_${Date.now()}`,
            patientId: b.patientId,
            scheduleId: b.medicationScheduleId,
            status: b.doseStatus,
            confirmedAt: new Date().toISOString(),
          },
        },
      };
    },
  },

  // Appointments
  {
    method: 'GET',
    pattern: '/appointments',
    requiresSession: true,
    handle: () => ({
      status: 200,
      body: { appointments: initialAppointments, data: { appointments: initialAppointments } },
    }),
  },
  {
    method: 'POST',
    pattern: '/appointments',
    requiresSession: true,
    handle: (req) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const newApt: MockAppointment = {
        id: `apt_${Date.now()}`,
        patientId: String(b.patientId || 'pat_raghav'),
        provider: String(b.provider || 'Provider'),
        specialty: String(b.specialty || ''),
        startsAt: String(b.startsAt || new Date().toISOString()),
        endsAt: b.endsAt ? String(b.endsAt) : undefined,
        location: String(b.location || 'Clinic'),
        timezone: 'Asia/Kolkata',
        status: 'scheduled',
        notes: b.notes ? String(b.notes) : '',
        createdAt: new Date().toISOString(),
      };
      initialAppointments.unshift(newApt);
      return { status: 201, body: { appointment: newApt, data: { appointment: newApt } } };
    },
  },
  {
    method: 'PATCH',
    pattern: '/appointments/:id',
    requiresSession: true,
    handle: (req) => {
      const id = req.params.id;
      const apt = initialAppointments.find((a) => a.id === id);
      if (!apt) return { status: 404, body: { code: 'not_found' } };
      Object.assign(apt, req.body);
      return { status: 200, body: { appointment: apt, data: { appointment: apt } } };
    },
  },

  // Records & Health Readings & Check-ins
  {
    method: 'GET',
    pattern: '/records',
    requiresSession: true,
    handle: () => ({
      status: 200,
      body: { records: initialRecords, data: { records: initialRecords } },
    }),
  },
  {
    method: 'POST',
    pattern: '/records/upload-url',
    requiresSession: true,
    handle: () => ({
      status: 200,
      body: {
        uploadUrl: 'https://storage.mock.local/upload',
        storageKey: `key_${Date.now()}`,
        expiresAt: new Date(Date.now() + 900000).toISOString(),
        expiresInSeconds: 900,
      },
    }),
  },
  {
    method: 'POST',
    pattern: '/records/confirm',
    requiresSession: true,
    handle: (req) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const newRec: MockRecord = {
        id: `rec_${Date.now()}`,
        patientId: String(b.patientId || 'pat_raghav'),
        recordType: String(b.recordType || 'clinical_note'),
        fileName: String(b.fileName || 'note.pdf'),
        contentType: String(b.contentType || 'application/pdf'),
        fileSizeBytes: Number(b.fileSizeBytes || 1024),
        uploadedBy: { displayName: 'Anita Rao', role: 'caregiver' },
        notes: b.notes ? String(b.notes) : '',
        createdAt: new Date().toISOString(),
      };
      initialRecords.unshift(newRec);
      return { status: 201, body: { record: newRec, data: { record: newRec } } };
    },
  },
  {
    method: 'GET',
    pattern: '/records/:id/download-url',
    requiresSession: true,
    handle: () => ({
      status: 200,
      body: {
        downloadUrl: '#',
        expiresInSeconds: 900,
      },
    }),
  },
  {
    method: 'GET',
    pattern: '/health-readings',
    requiresSession: true,
    handle: () => ({
      status: 200,
      body: { readings: initialReadings, data: { readings: initialReadings } },
    }),
  },
  {
    method: 'POST',
    pattern: '/health-readings',
    requiresSession: true,
    handle: (req) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const newRdg: MockReading = {
        id: `rdg_${Date.now()}`,
        patientId: String(b.patientId || 'pat_raghav'),
        type: String(b.type || 'heart_rate'),
        value: Number(b.value || 0),
        unit: String(b.unit || ''),
        measuredAt: String(b.measuredAt || new Date().toISOString()),
        source: 'caregiver_entry',
        notes: b.notes ? String(b.notes) : '',
        createdAt: new Date().toISOString(),
      };
      initialReadings.unshift(newRdg);
      return { status: 201, body: { reading: newRdg, data: { reading: newRdg } } };
    },
  },
  {
    method: 'GET',
    pattern: '/check-ins',
    requiresSession: true,
    handle: () => ({
      status: 200,
      body: { checkIns: initialCheckIns, data: { checkIns: initialCheckIns } },
    }),
  },
  {
    method: 'POST',
    pattern: '/check-ins',
    requiresSession: true,
    handle: (req) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const newChk: MockCheckIn = {
        id: `chk_${Date.now()}`,
        patientId: String(b.patientId || 'pat_raghav'),
        appointmentId: b.appointmentId ? String(b.appointmentId) : undefined,
        feeling: String(b.feeling || 'good'),
        painScore: Number(b.painScore || 0),
        symptoms: Array.isArray(b.symptoms) ? b.symptoms.map(String) : [],
        notes: b.notes ? String(b.notes) : '',
        respondentType: 'patient',
        createdAt: new Date().toISOString(),
      };
      initialCheckIns.unshift(newChk);
      return { status: 201, body: { checkIn: newChk, data: { checkIn: newChk } } };
    },
  },

  // Relationships
  {
    method: 'GET',
    pattern: '/relationships',
    requiresSession: true,
    handle: () => ({
      status: 200,
      body: { relationships: initialRelationships, data: { relationships: initialRelationships } },
    }),
  },
  {
    method: 'POST',
    pattern: '/relationships',
    requiresSession: true,
    handle: (req) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const newRel: MockRelationship = {
        id: `rel_${Date.now()}`,
        patientId: {
          id: String(b.patientId || 'pat_raghav'),
          displayName: 'Raghav Rao',
          role: 'patient',
        },
        caregiverId: {
          id: String(b.caregiverId || 'usr_caregiver'),
          displayName: 'Caregiver Member',
          role: 'caregiver',
        },
        permissions: Array.isArray(b.permissions) ? b.permissions.map(String) : ['all'],
        relationshipType: String(b.relationshipType || 'Family Member'),
        consentStatus: 'active',
        notes: b.notes ? String(b.notes) : '',
        createdAt: new Date().toISOString(),
      };
      initialRelationships.push(newRel);
      return { status: 201, body: { relationship: newRel, data: { relationship: newRel } } };
    },
  },
  {
    method: 'PATCH',
    pattern: '/relationships/:id',
    requiresSession: true,
    handle: (req) => {
      const id = req.params.id;
      const rel = initialRelationships.find((r) => r.id === id);
      if (!rel) return { status: 404, body: { code: 'not_found' } };
      Object.assign(rel, req.body);
      return { status: 200, body: { relationship: rel, data: { relationship: rel } } };
    },
  },

  // Alerts & Audit
  {
    method: 'POST',
    pattern: '/alerts',
    requiresSession: true,
    handle: (req) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const newEvent: MockAuditEvent = {
        id: `aud_${Date.now()}`,
        actorId: { displayName: 'Anita Rao', role: 'caregiver' },
        patientId: String(b.patientId || 'pat_raghav'),
        action: 'CAREGIVER_ALERT_TRIGGERED',
        targetType: 'caregiver_alert',
        result: 'SUCCESS',
        createdAt: new Date().toISOString(),
        metadata: { title: b.title, severity: b.severity },
      };
      initialAuditEvents.unshift(newEvent);
      return {
        status: 201,
        body: {
          alert: {
            id: `alt_${Date.now()}`,
            title: b.title,
            severity: b.severity,
            recipientsNotified: 2,
          },
        },
      };
    },
  },
  {
    method: 'GET',
    pattern: '/audit',
    requiresSession: true,
    handle: () => ({
      status: 200,
      body: { events: initialAuditEvents, data: { events: initialAuditEvents } },
    }),
  },

  // Assistant
  {
    method: 'POST',
    pattern: '/assistant/message',
    requiresSession: true,
    handle: (req) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const userMsg = String(b.message || '').toLowerCase();
      let reply =
        "I'm CareCircle Assistant. I can help coordinate your daily care tasks, upcoming medication times, and doctor appointments.";
      const actions: unknown[] = [];

      // 1. Emergency safety check
      if (userMsg.includes('chest pain') || userMsg.includes("can't breathe") || userMsg.includes('cannot breathe') || userMsg.includes('stroke') || userMsg.includes('bleeding')) {
        reply = "CRITICAL NOTICE: You mentioned symptoms that may require urgent medical attention. Please call your local emergency services (e.g., 911 or 112) or seek immediate emergency care right now. Do not wait for caregiver coordination or this assistant.";
      }
      // 2. Clinical boundary / prescription check
      else if (userMsg.includes('prescribe') || userMsg.includes('change his dose') || userMsg.includes('change her dose') || userMsg.includes('double the dose')) {
        reply = "As an AI care assistant, I cannot modify medication dosages, prescribe drugs, or provide clinical diagnoses. Please consult your prescribing physician, cardiologist, or qualified healthcare professional before making any changes.";
      }
      // 3. Cross-session memory correlation
      else if (userMsg.includes('dizzy') || userMsg.includes('dizziness') || userMsg.includes('lightheaded')) {
        reply = "Proactive Clinical Note: Dad started Amlodipine (5mg) 2 days ago. Dizziness is a common temporary adjustment symptom for blood pressure medications. Would you like me to flag this for his doctor or record his current BP?";
        actions.push({ tool: 'correlate_symptom_with_medications', status: 'succeeded', arguments: { patient_id: 'cir_demo', symptom: 'dizziness' } });
      }
      // 4. Task creation reminder
      else if (userMsg.includes('remind') || userMsg.includes('walk') || userMsg.includes('schedule a task')) {
        reply = "I created the reminder: 'Take his evening walk at 6:00 pm' scheduled for 6:00 PM.";
        actions.push({ tool: 'create_care_task', status: 'succeeded', arguments: { title: 'Take his evening walk at 6:00 pm', dueAt: '6:00 PM', priority: 'normal' } });
      }
      // 5. Vitals logging
      else if (userMsg.includes('blood pressure') || userMsg.includes('125/80') || userMsg.includes('120/80')) {
        reply = "Logged blood pressure reading of 125/80 mmHg. It has been saved to the family dashboard.";
        actions.push({ tool: 'add_health_reading', status: 'succeeded', arguments: { type: 'blood_pressure', value: '125/80', unit: 'mmHg' } });
      }
      // 6. Default tasks query
      else if (userMsg.includes('task') || userMsg.includes('due today')) {
        reply = `You have ${initialTasks.filter((t) => t.status === 'pending').length} tasks pending for today. Blood pressure check is scheduled for this morning.`;
        actions.push({ tool: 'list_tasks', status: 'succeeded', arguments: { status: 'pending' } });
      } else if (userMsg.includes('appointment')) {
        reply = `Next appointment is with Dr. V. K. Sharma (Cardiologist) on Oct 24 at Care Heart Clinic.`;
        actions.push({ tool: 'list_appointments', status: 'succeeded' });
      } else {
        reply = "I'm CareCircle Assistant. I can help coordinate your daily care tasks, upcoming medication times, and doctor appointments.";
      }

      return {
        status: 200,
        body: {
          reply,
          actions,
          needsConfirmation: false,
          conversationId: String(b.conversationId || `conv_${Date.now()}`),
          requestId: `req_${Date.now()}`,
        },
      };
    },
  },
  {
    method: 'POST',
    pattern: '/assistant/actions/confirm',
    requiresSession: true,
    handle: (req) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      return {
        status: 200,
        body: {
          reply: b.confirmed
            ? 'The action was confirmed and carried out.'
            : 'The action was cancelled.',
          actions: [],
          needsConfirmation: false,
          conversationId: String(b.conversationId || ''),
          requestId: `req_${Date.now()}`,
        },
      };
    },
  },
];
