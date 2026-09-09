export type SaveState = { key: string; label: string; error?: string };
export class BackgroundSaves {
  private jobs = new Map<string, SaveState & { task: () => Promise<void>; running: boolean }>();
  constructor(private changed: (states: SaveState[]) => void) {}
  get size() { return this.jobs.size; }
  private emit() { this.changed([...this.jobs.values()].map(({key,label,error}) => ({key,label,error}))); }
  add(key: string, label: string, task: () => Promise<void>) {
    if (this.jobs.has(key)) throw Error('This word still has an unfinished save. Check the saving status above.');
    this.jobs.set(key, {key,label,task,running:false});
    void this.run(key);
  }
  async run(key: string) {
    const job = this.jobs.get(key);
    if (!job || job.running) return;
    job.running = true; job.error = undefined; this.emit();
    try { await job.task(); this.jobs.delete(key); }
    catch (error) { job.error = error instanceof Error ? error.message : 'Could not save this word.'; }
    finally { job.running = false; this.emit(); }
  }
}
