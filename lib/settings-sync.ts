export type Preferences = {level_code?: string; lang_code?: string; username?: string; updated_at?: number};
export function reconcilePreferences(remote: Preferences, saved: {email: string; settings: Preferences} | null, email: string): Preferences {
  if (!saved || saved.email !== email) return remote;
  return Number(remote.updated_at || 0) < Number(saved.settings.updated_at || 0)
    ? {...remote, ...saved.settings} : remote;
}
