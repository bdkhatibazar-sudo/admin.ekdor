const inMemoryStoreData = new Map<string, any>();

export async function getStoreData(uid: string): Promise<any> {
  const data = inMemoryStoreData.get(uid);
  return data || {};
}

export async function syncStoreData(uid: string, data: any): Promise<{ success: boolean; syncedAt: string }> {
  inMemoryStoreData.set(uid, {
    ...data,
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    syncedAt: new Date().toISOString(),
  };
}
