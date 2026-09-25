export interface DbUser {
  id: string;
  uid: string;
  email: string;
  name?: string;
  createdAt: string;
}

const inMemoryUsers = new Map<string, DbUser>();

export async function getOrCreateUser(uid: string, email: string, name?: string): Promise<DbUser> {
  const existing = inMemoryUsers.get(uid);
  if (existing) {
    return existing;
  }

  const newUser: DbUser = {
    id: `user-${Date.now()}`,
    uid,
    email,
    name: name || 'দোকানদার',
    createdAt: new Date().toISOString(),
  };

  inMemoryUsers.set(uid, newUser);
  return newUser;
}
