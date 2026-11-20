import { currentJournalSchemaVersion } from './migrations.js';

export function verifyJournalVersion(
  name: string,
  factory?: Pick<IDBFactory, 'open'>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!factory) {
      reject(new Error('IndexedDB is unavailable.'));
      return;
    }
    const request = factory.open(name);
    let newDatabase = false;
    request.onupgradeneeded = () => {
      // An unversioned probe creates a database only if it was missing.
      // Abort that provisional creation and let Dexie install the full schema.
      newDatabase = true;
      request.transaction?.abort();
    };
    request.onerror = () => {
      if (newDatabase && request.error?.name === 'AbortError') resolve();
      else reject(request.error);
    };
    request.onsuccess = () => {
      const database = request.result;
      const schemaVersion = Math.floor(database.version / 10);
      database.close();
      // Dexie otherwise retries VersionError without a version and may patch
      // missing stores in a newer database before the application sees it.
      if (schemaVersion > currentJournalSchemaVersion)
        reject(new RangeError('This journal requires a newer application.'));
      else resolve();
    };
  });
}
