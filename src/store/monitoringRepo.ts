import { snapshotSchema, initialSnapshot, type MonitoringSnapshot } from '../platform/contracts';
import { getDB } from './db';
import { guard } from './repoBase';
export const loadMonitoring = (id: string) =>
  guard(async () => {
    const raw = await (await getDB()).get('monitoring', id);
    return raw ? snapshotSchema.parse(raw) : initialSnapshot(id);
  });
export const saveMonitoring = (snapshot: MonitoringSnapshot) =>
  guard(async () => {
    const parsed = snapshotSchema.parse(snapshot),
      db = await getDB();
    // Do not recreate orphaned monitoring data after profile deletion.
    const tx = db.transaction(['profiles', 'monitoring'], 'readwrite');
    if (!(await tx.objectStore('profiles').get(parsed.individualId))) throw new Error('Profile no longer exists.');
    await tx.objectStore('monitoring').put(parsed);
    await tx.done;
  });
