export const dynamic = "force-dynamic";

import { SettingsSecurityForm } from "@/components/auth/settings-security-form";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Account settings</p>
        <h2 className="text-3xl font-semibold text-slate-950">Security</h2>
      </div>
      <div className="flex justify-end">
        <a className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/settings/connections">
          View connections
        </a>
      </div>
      <SettingsSecurityForm />
    </div>
  );
}
