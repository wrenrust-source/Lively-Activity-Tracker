// IndexedDB operations for storing audio recordings

interface StoredAudio {
  id: string;
  timestamp: Date;
  transcript: string;
  audioBlob: Blob;
  duration: number;
}

const DB_NAME = 'HealthTrackerDB';
const STORE_NAME = 'audioRecordings';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

export async function initializeAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

export async function saveAudioRecording(
  audioBlob: Blob,
  transcript: string,
  timestamp: Date,
  duration: number
): Promise<string> {
  const database = await initializeAudioDB();
  const id = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const recording: Omit<StoredAudio, 'audioBlob'> & { audioBlob: Blob } = {
      id,
      timestamp,
      transcript,
      audioBlob,
      duration,
    };

    const request = store.add(recording);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(id);
  });
}

export async function getAudioRecording(id: string): Promise<StoredAudio | null> {
  const database = await initializeAudioDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function getAllAudioRecordings(): Promise<StoredAudio[]> {
  const database = await initializeAudioDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function deleteAudioRecording(id: string): Promise<void> {
  const database = await initializeAudioDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export function getAudioBlobUrl(audioBlob: Blob): string {
  return URL.createObjectURL(audioBlob);
}

export function downloadAudioRecording(audioBlob: Blob, filename: string): void {
  const url = getAudioBlobUrl(audioBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
