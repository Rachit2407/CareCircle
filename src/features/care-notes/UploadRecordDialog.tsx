import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormAlert } from '@/components/ui/FormAlert';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import { recordService } from '@/services/recordService';
import type { RecordType } from '@/schemas/records';

interface UploadRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadRecordDialog({ open, onOpenChange }: UploadRecordDialogProps) {
  const { circle } = useAuthedSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const patientId = circle?.id || 'pat_raghav';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordType, setRecordType] = useState<RecordType>('clinical_note');
  const [notes, setNotes] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Please select a file to upload');

      // 1. Request signed upload URL from backend
      const uploadSigned = await recordService.requestUploadUrl({
        patientId,
        fileName: selectedFile.name,
        contentType: selectedFile.type || 'application/pdf',
        fileSizeBytes: selectedFile.size,
        recordType,
        notes: notes.trim() || undefined,
      });

      // 2. Put file to signed uploadUrl if external
      try {
        if (
          uploadSigned.uploadUrl &&
          !uploadSigned.uploadUrl.startsWith('https://storage.mock.local')
        ) {
          // eslint-disable-next-line no-restricted-globals -- signed URL targets external storage, not the app API
          await fetch(uploadSigned.uploadUrl, {
            method: 'PUT',
            body: selectedFile,
            headers: {
              'Content-Type': selectedFile.type || 'application/pdf',
            },
          });
        }
      } catch {
        // Fallback or mock storage simulation
      }

      // 3. Confirm record metadata with backend
      return recordService.confirmRecord({
        patientId,
        storageKey: uploadSigned.storageKey,
        fileName: selectedFile.name,
        contentType: selectedFile.type || 'application/pdf',
        fileSizeBytes: selectedFile.size,
        recordType,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['records'] });
      toast.show('record_uploaded');
      onOpenChange(false);
      setSelectedFile(null);
      setNotes('');
      setUploadError(null);
    },
    onError: (err: Error) => {
      setUploadError(err.message || 'File upload failed. Ensure the file is under 10MB.');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File exceeds 10MB maximum limit.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a document or image to upload.');
      return;
    }
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Upload clinical record or document"
      description="Upload authenticated lab reports, prescriptions, discharge summaries, or clinical notes."
    >
      <form onSubmit={handleUploadSubmit} className="space-y-4">
        {uploadError && (
          <FormAlert tone="danger" title="Upload error">
            {uploadError}
          </FormAlert>
        )}

        <div className="space-y-1.5">
          <label htmlFor="record-type" className="block text-base font-bold text-ink">
            Record type
          </label>
          <select
            id="record-type"
            value={recordType}
            onChange={(e) => setRecordType(e.target.value as RecordType)}
            className="h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-base font-medium text-ink focus-visible:border-navy-700"
          >
            <option value="clinical_note">Clinical care note</option>
            <option value="lab_result">Lab test result</option>
            <option value="prescription">Doctor prescription</option>
            <option value="discharge_summary">Discharge summary</option>
            <option value="imaging">Imaging report (X-ray / MRI / Ultrasound)</option>
            <option value="vaccination">Vaccination certificate</option>
            <option value="other">Other medical document</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="file-upload" className="block text-base font-bold text-ink">
            Document file{' '}
            <span className="text-sm font-normal text-ink-muted">(PDF, JPG, PNG up to 10MB)</span>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.tiff"
            onChange={handleFileChange}
            className="h-12 w-full rounded-xl border-2 border-dashed border-line bg-navy-50/50 p-2 text-sm text-ink file:mr-4 file:rounded-full file:border-0 file:bg-navy-900 file:px-4 file:py-1.5 file:text-xs file:font-bold file:text-paper hover:border-navy-700"
          />
          {selectedFile && (
            <p className="text-xs text-ink-muted">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="record-notes" className="block text-base font-bold text-ink">
            Observation / Summary notes
          </label>
          <textarea
            id="record-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key findings, physician remarks, or instructions..."
            className="w-full rounded-xl border-2 border-line bg-paper px-4 py-2.5 text-base text-ink placeholder:text-ink-muted focus-visible:border-navy-700"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isUploading}
            loadingText="Uploading…"
            disabled={!selectedFile}
          >
            Upload record
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
