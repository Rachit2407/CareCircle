import {
  Activity,
  Download,
  FileText,
  Filter,
  HeartPulse,
  NotebookPen,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthedSession } from '@/hooks/useSession';
import { recordService } from '@/services/recordService';
import { ui } from '@/styles/tokens';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/datetime';
import { ReadingDialog } from './ReadingDialog';
import { UploadRecordDialog } from './UploadRecordDialog';

export function CareNotesPage() {
  const { user } = useAuthedSession();
  const location = useLocation();

  const isNewRoute = location.pathname.endsWith('/new');
  const [activeTab, setActiveTab] = useState<'records' | 'readings' | 'checkins'>('records');

  const [readingDialogOpen, setReadingDialogOpen] = useState(isNewRoute);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>('all');

  const recordsQuery = useQuery({
    queryKey: ['records'],
    queryFn: () => recordService.listRecords(),
  });

  const readingsQuery = useQuery({
    queryKey: ['health-readings'],
    queryFn: () => recordService.listHealthReadings(),
  });

  const checkInsQuery = useQuery({
    queryKey: ['check-ins'],
    queryFn: () => recordService.listCheckIns(),
  });

  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);
  const readings = readingsQuery.data ?? [];
  const checkIns = checkInsQuery.data ?? [];

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (recordTypeFilter !== 'all' && rec.recordType !== recordTypeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesFile = rec.fileName.toLowerCase().includes(q);
        const matchesNotes = rec.notes?.toLowerCase().includes(q) ?? false;
        if (!matchesFile && !matchesNotes) return false;
      }
      return true;
    });
  }, [records, recordTypeFilter, search]);

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const res = await recordService.getDownloadUrl(id);
      if (res.downloadUrl && res.downloadUrl !== '#') {
        window.open(res.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        // Mock fallback alert/simulation
        const dummyUrl = URL.createObjectURL(
          new Blob(['CareCircle record document content'], { type: 'text/plain' }),
        );
        const a = document.createElement('a');
        a.href = dummyUrl;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(dummyUrl);
      }
    } catch {
      // Graceful download fallback
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Care Notes & Records"
        description="Chronological health records, vital telemetry readings, and daily caregiver observations."
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setReadingDialogOpen(true)}>
              <Activity aria-hidden="true" className="h-5 w-5" />
              <span>Record vitals</span>
            </Button>
            <Button variant="primary" onClick={() => setUploadDialogOpen(true)}>
              <Upload aria-hidden="true" className="h-5 w-5" />
              <span>Upload document</span>
            </Button>
          </div>
        }
      />

      {/* Tabs Switcher */}
      <div className="flex border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab('records')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 text-base font-bold transition-colors',
            activeTab === 'records'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-ink-muted hover:text-ink',
          )}
        >
          <FileText aria-hidden="true" className="h-5 w-5" />
          <span>Clinical records ({records.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('readings')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 text-base font-bold transition-colors',
            activeTab === 'readings'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-ink-muted hover:text-ink',
          )}
        >
          <Activity aria-hidden="true" className="h-5 w-5" />
          <span>Health readings ({readings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checkins')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 text-base font-bold transition-colors',
            activeTab === 'checkins'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-ink-muted hover:text-ink',
          )}
        >
          <HeartPulse aria-hidden="true" className="h-5 w-5" />
          <span>Daily check-in logs ({checkIns.length})</span>
        </button>
      </div>

      {/* TAB 1: Clinical Records */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className={cn(ui.surface.saved, 'p-4')}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search file name or observation notes…"
                  className="h-11 w-full rounded-xl border border-line bg-paper pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-navy-700 focus:outline-none"
                />
              </div>

              <div className="relative w-full sm:w-60">
                <Filter
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                />
                <select
                  value={recordTypeFilter}
                  onChange={(e) => setRecordTypeFilter(e.target.value)}
                  aria-label="Filter by record category"
                  className="h-11 w-full rounded-xl border border-line bg-paper pl-9 pr-3 text-sm text-ink focus:border-navy-700"
                >
                  <option value="all">All categories</option>
                  <option value="clinical_note">Clinical care notes</option>
                  <option value="lab_result">Lab test results</option>
                  <option value="prescription">Prescriptions</option>
                  <option value="discharge_summary">Discharge summaries</option>
                  <option value="imaging">Imaging reports</option>
                  <option value="vaccination">Vaccinations</option>
                </select>
              </div>
            </div>
          </div>

          {recordsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-bubble" />
              <Skeleton className="h-24 w-full rounded-bubble" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="No documents uploaded"
              description="Keep test results, prescription scans, and doctor summary notes safely stored and scoped."
              action={
                <Button variant="primary" onClick={() => setUploadDialogOpen(true)}>
                  <Upload aria-hidden="true" className="h-5 w-5" />
                  <span>Upload document</span>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((rec) => (
                <div
                  key={rec.id}
                  className={cn(
                    ui.surface.saved,
                    'flex flex-col justify-between gap-4 p-5 transition-shadow hover:shadow-lift sm:flex-row sm:items-center',
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-display text-lg font-bold">{rec.fileName}</h3>
                      <span className="rounded-full bg-navy-100 px-3 py-0.5 text-xs font-bold text-navy-800">
                        {rec.recordType.replace('_', ' ')}
                      </span>
                    </div>

                    {rec.notes && <p className="text-sm text-ink-soft">{rec.notes}</p>}

                    <p className="text-xs text-ink-muted">
                      Uploaded by {rec.uploaderName} • {(rec.fileSizeBytes / 1024).toFixed(1)} KB •{' '}
                      <time dateTime={rec.createdAt}>
                        {formatDateTime(rec.createdAt, user.timeZone)}
                      </time>
                    </p>
                  </div>

                  <Button
                    size="md"
                    variant="secondary"
                    onClick={() => handleDownload(rec.id, rec.fileName)}
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                    <span>Download</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Health Readings */}
      {activeTab === 'readings' && (
        <div className="space-y-4">
          {readingsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-bubble" />
              <Skeleton className="h-20 w-full rounded-bubble" />
            </div>
          ) : readings.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No vitals recorded"
              description="Record daily blood pressure, pulse, blood sugar, and body temperature readings."
              action={
                <Button variant="primary" onClick={() => setReadingDialogOpen(true)}>
                  <Plus aria-hidden="true" className="h-5 w-5" />
                  <span>Record first reading</span>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {readings.map((rdg) => (
                <div key={rdg.id} className={cn(ui.surface.saved, 'p-5')}>
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    {rdg.type.replace(/_/g, ' ')}
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-display text-3xl font-bold">{rdg.value}</span>
                    <span className="text-sm font-semibold text-ink-soft">{rdg.unit}</span>
                  </div>
                  {rdg.notes && (
                    <p className="mt-2 text-xs text-ink-soft italic">&ldquo;{rdg.notes}&rdquo;</p>
                  )}
                  <p className="mt-3 border-t border-line pt-2 text-xs text-ink-muted">
                    Measured: {formatDateTime(rdg.measuredAt, user.timeZone)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Daily Check-in Logs */}
      {activeTab === 'checkins' && (
        <div className="space-y-4">
          {checkInsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-bubble" />
            </div>
          ) : checkIns.length === 0 ? (
            <EmptyState
              icon={HeartPulse}
              title="No check-ins recorded"
              description="Daily check-in logs help coordinate observations about patient pain, symptoms, and feelings."
            />
          ) : (
            <div className="space-y-3">
              {checkIns.map((chk) => (
                <div key={chk.id} className={cn(ui.surface.saved, 'p-5')}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-success-bg px-3 py-1 text-sm font-bold text-success-fg">
                        Feeling: {chk.feeling}
                      </span>
                      <span className="rounded-full bg-navy-100 px-3 py-1 text-sm font-bold text-navy-800">
                        Pain score: {chk.painScore}/10
                      </span>
                    </div>
                    <span className="text-xs text-ink-muted">
                      {formatDateTime(chk.createdAt || '', user.timeZone)}
                    </span>
                  </div>

                  {chk.symptoms && chk.symptoms.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {chk.symptoms.map((s, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-semibold text-warning-fg"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {chk.notes && (
                    <p className="mt-2 text-sm text-ink-soft">
                      Observation: &ldquo;{chk.notes}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <ReadingDialog open={readingDialogOpen} onOpenChange={setReadingDialogOpen} />

      <UploadRecordDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
    </div>
  );
}
