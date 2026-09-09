// AdSense IDs are public. Populate these from the website's AdSense account.
// Enable only after site approval and the account's consent message are ready.
export const ADSENSE = {
  enabled: false,
  // Serves Google's test creatives instead of real ones, so verifying the
  // deployed placements cannot generate invalid impressions. Turn off to earn.
  testMode: false,
  publisherId: '',
  slots: { top: '', bottom: '', left: '', right: '' },
};

export type AdPlacement = keyof typeof ADSENSE.slots;

export function adsConfigured(placement: AdPlacement) {
  return ADSENSE.enabled && /^ca-pub-\d{16}$/.test(ADSENSE.publisherId)
    && /^\d+$/.test(ADSENSE.slots[placement]);
}
