export async function takeSharedPdfs(): Promise<File[]> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open("biblioteca-hq-shared-import-v1", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("files", { keyPath: "id", autoIncrement: true });
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    return await new Promise<File[]>((resolve, reject) => {
      const tx = db.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const request = store.getAll();
      let files: File[] = [];
      request.onsuccess = () => { const rows = request.result as Array<{ file: File }>; files = rows.map((row) => row.file); };
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve(files);
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export async function clearSharedPdfs(): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open("biblioteca-hq-shared-import-v1", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("files", { keyPath: "id", autoIncrement: true });
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
