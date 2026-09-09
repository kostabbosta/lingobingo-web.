// Loading account data is not evidence that the session has ended.
export async function requireLoadedAccount<T>(
  read: () => T | null,
  load: () => Promise<void>,
  signedOut: () => boolean,
): Promise<T> {
  const current = read();
  if (current) return current;
  await load();
  const loaded = read();
  if (loaded) return loaded;
  throw Object.assign(new Error(signedOut()
    ? 'Sign in to save your progress.'
    : 'Your progress could not load. Please try again.'), { status: signedOut() ? 401 : 503 });
}
