export type PendingImport<T> = {
  pdf: File | null;
  batchPdfs: File[];
  cover: File | null;
  batchCovers: File[];
  form: T;
  savedAt: number;
};

const DB_NAME = "biblioteca-hq-pending-import-v1";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadPendingImport<T>(userId: string): Promise<PendingImport<T> | null> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("drafts").objectStore("drafts").get(userId);
      request.onsuccess = () => resolve((request.result as PendingImport<T> | undefined) || null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

export async function savePendingImport<T>(userId: string, draft: PendingImport<T> | null): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("drafts", "readwrite");
      if (draft) transaction.objectStore("drafts").put(draft, userId);
      else transaction.objectStore("drafts").delete(userId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}
