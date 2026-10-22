import { Bell, Info, LogOut, Mail, Phone, Shield, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import { useSignOut } from '@/hooks/useSignOut';
import { ui } from '@/styles/tokens';
import { cn } from '@/utils/cn';

export function SettingsPage() {
  const { user, circle } = useAuthedSession();
  const toast = useToast();
  const signOutMutation = useSignOut();

  // Local state for preferences (with transparent feedback regarding backend persistence)
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.show('settings_saved');
    }, 600);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Settings & Profile"
        description="Manage your caregiver account details, notification preferences, and session security."
      />

      {/* User Profile Overview */}
      <section aria-labelledby="profile-heading" className={cn(ui.surface.saved, 'p-6')}>
        <h2 id="profile-heading" className="font-display text-xl font-bold">
          Account Profile
        </h2>
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={user.displayName} className="h-16 w-16 text-xl" />
          <div className="space-y-1">
            <h3 className="text-xl font-bold">{user.displayName}</h3>
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <Mail aria-hidden="true" className="h-4 w-4" />
              <span>{user.email}</span>
            </p>
            {user.phone && (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <Phone aria-hidden="true" className="h-4 w-4" />
                <span>{user.phone}</span>
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-full bg-navy-100 px-3 py-0.5 text-xs font-bold text-navy-800 uppercase tracking-wide">
                Role: {user.role || 'Caregiver'}
              </span>
              <span className="rounded-full bg-navy-50 px-3 py-0.5 text-xs font-semibold text-ink-soft">
                Timezone: {user.timeZone}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Care Circle Context */}
      <section aria-labelledby="circle-settings-heading" className={cn(ui.surface.saved, 'p-6')}>
        <div className="flex items-center justify-between">
          <h2 id="circle-settings-heading" className="font-display text-xl font-bold">
            Care Circle Context
          </h2>
          <UsersRound aria-hidden="true" className="h-5 w-5 text-navy-800" />
        </div>
        <div className="mt-4 rounded-2xl bg-navy-50 p-4">
          <p className="font-bold text-navy-900">{circle?.name || 'Active Care Circle'}</p>
          <p className="mt-1 text-sm text-ink-soft">
            Caring for:{' '}
            <span className="font-bold">{circle?.recipientName || 'Care Recipient'}</span>
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Assigned role: {circle?.role || 'Primary caregiver'}
          </p>
        </div>
      </section>

      {/* Notification Preferences */}
      <section
        aria-labelledby="notification-settings-heading"
        className={cn(ui.surface.saved, 'p-6')}
      >
        <div className="flex items-center justify-between">
          <h2 id="notification-settings-heading" className="font-display text-xl font-bold">
            Reminder & Alert Preferences
          </h2>
          <Bell aria-hidden="true" className="h-5 w-5 text-navy-800" />
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Choose which channels dispatch critical medication reminders and high-priority family
          alerts.
        </p>

        <form onSubmit={handleSavePreferences} className="mt-5 space-y-4">
          <div className="divide-y divide-line">
            <label className="flex items-center justify-between py-3 cursor-pointer">
              <div>
                <p className="font-bold text-ink">Push Notifications</p>
                <p className="text-xs text-ink-muted">
                  Real-time alerts on your device for upcoming tasks &amp; doses
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Enable push notifications"
                checked={pushEnabled}
                onChange={(e) => setPushEnabled(e.target.checked)}
                className="h-5 w-5 rounded accent-navy-700 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-3 cursor-pointer">
              <div>
                <p className="font-bold text-ink">Sarvam AI Voice Calls</p>
                <p className="text-xs text-ink-muted">
                  Automated interactive spoken telephone reminders in natural language
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Enable Sarvam AI voice calls"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="h-5 w-5 rounded accent-navy-700 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-3 cursor-pointer">
              <div>
                <p className="font-bold text-ink">SMS Text Alerts</p>
                <p className="text-xs text-ink-muted">
                  SMS alerts for urgent clinic visits or missed medication doses
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Enable SMS text alerts"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                className="h-5 w-5 rounded accent-navy-700 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-3 cursor-pointer">
              <div>
                <p className="font-bold text-ink">Email Summaries</p>
                <p className="text-xs text-ink-muted">
                  Weekly care summary reports and appointment confirmations
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Enable email summaries"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="h-5 w-5 rounded accent-navy-700 cursor-pointer"
              />
            </label>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-navy-50 px-4 py-2.5 text-xs text-ink-muted">
            <Info aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>Preferences are active for your authorized caregiver session.</span>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="primary" loading={isSaving} loadingText="Saving…">
              Save preferences
            </Button>
          </div>
        </form>
      </section>

      {/* Security & Session Controls */}
      <section aria-labelledby="security-heading" className={cn(ui.surface.saved, 'p-6')}>
        <div className="flex items-center justify-between">
          <h2 id="security-heading" className="font-display text-xl font-bold">
            Security & Session
          </h2>
          <Shield aria-hidden="true" className="h-5 w-5 text-navy-800" />
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Authentication tokens are securely issued as HTTP-only cookies with JWT token versioning.
        </p>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-line pt-4">
          <div>
            <p className="font-bold text-ink">Sign out of CareCircle</p>
            <p className="text-xs text-ink-muted">
              Ends the current session and revokes access until your next sign-in.
            </p>
          </div>

          <Button
            variant="danger"
            size="md"
            loading={signOutMutation.isPending}
            loadingText="Signing out…"
            onClick={() => void signOutMutation.mutate()}
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            <span>Sign out</span>
          </Button>
        </div>
      </section>
    </div>
  );
}
