import crypto from 'crypto';
import { env } from '../config/env.js';
import { ValidationError } from '../utils/errors.js';

export interface SignedUrlResult {
  uploadUrl?: string;
  downloadUrl?: string;
  storageKey: string;
  expiresAt: Date;
  expiresInSeconds: number;
}

export const ALLOWED_HEALTH_RECORD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/dicom',
  'text/plain',
];

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export class StorageService {
  private static signingSecret = env.STORAGE_SIGNING_SECRET;

  public static generateStorageKey(patientId: string, fileName: string): string {
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(6).toString('hex');
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `patients/${patientId}/${timestamp}-${randomHex}-${sanitizedName}`;
  }

  public static generateSignedUploadUrl(
    patientId: string,
    fileName: string,
    contentType: string,
    fileSizeBytes: number
  ): SignedUrlResult {
    if (!ALLOWED_HEALTH_RECORD_MIME_TYPES.includes(contentType.toLowerCase())) {
      throw new ValidationError(
        `Unsupported file type '${contentType}'. Allowed types: ${ALLOWED_HEALTH_RECORD_MIME_TYPES.join(', ')}`
      );
    }

    if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`
      );
    }

    const storageKey = this.generateStorageKey(patientId, fileName);
    const expirySeconds = env.STORAGE_SIGNED_URL_EXPIRY_SECONDS;
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);
    const expiresTimestamp = Math.floor(expiresAt.getTime() / 1000);

    const payload = `PUT\n${storageKey}\n${contentType}\n${expiresTimestamp}`;
    const signature = crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');

    const uploadUrl = `${env.STORAGE_BASE_URL}/upload?key=${encodeURIComponent(
      storageKey
    )}&expires=${expiresTimestamp}&sig=${signature}`;

    return {
      uploadUrl,
      storageKey,
      expiresAt,
      expiresInSeconds: expirySeconds,
    };
  }

  public static generateSignedDownloadUrl(storageKey: string): SignedUrlResult {
    const expirySeconds = env.STORAGE_SIGNED_URL_EXPIRY_SECONDS;
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);
    const expiresTimestamp = Math.floor(expiresAt.getTime() / 1000);

    const payload = `GET\n${storageKey}\n${expiresTimestamp}`;
    const signature = crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');

    const downloadUrl = `${env.STORAGE_BASE_URL}/download?key=${encodeURIComponent(
      storageKey
    )}&expires=${expiresTimestamp}&sig=${signature}`;

    return {
      downloadUrl,
      storageKey,
      expiresAt,
      expiresInSeconds: expirySeconds,
    };
  }

  public static verifySignature(method: 'GET' | 'PUT', storageKey: string, expiresTimestamp: number, signature: string, contentType?: string): boolean {
    if (Math.floor(Date.now() / 1000) > expiresTimestamp) {
      return false; // Expired
    }

    const payload = method === 'PUT'
      ? `PUT\n${storageKey}\n${contentType || ''}\n${expiresTimestamp}`
      : `GET\n${storageKey}\n${expiresTimestamp}`;

    const expectedSig = crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));
  }
}
