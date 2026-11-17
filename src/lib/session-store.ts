import { v4 as uuidv4 } from "uuid";
import type { Session } from "@/types/session";

class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private readonly maxSessions = 100;
  private readonly sessionTtlMs = 60 * 60 * 1000;

  create(): Session {
    this.cleanup();
    const session: Session = {
      id: uuidv4(),
      resumeRawText: null,
      resumeStructured: null,
      jobs: [],
      matchResults: null,
      chatHistory: [],
      createdAt: Date.now(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): Session | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    if (Date.now() - session.createdAt > this.sessionTtlMs) {
      this.sessions.delete(id);
      return null;
    }
    return session;
  }

  update(id: string, updates: Partial<Session>): Session {
    const session = this.get(id);
    if (!session) throw new Error("Session " + id + " not found");
    const updated = { ...session, ...updates };
    this.sessions.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    this.sessions.delete(id);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.createdAt > this.sessionTtlMs) {
        this.sessions.delete(id);
      }
    }
    if (this.sessions.size >= this.maxSessions) {
      const oldest = [...this.sessions.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
      for (let i = 0; i < oldest.length - this.maxSessions + 1; i++) {
        this.sessions.delete(oldest[i][0]);
      }
    }
  }
}

const globalForStore = globalThis as unknown as { sessionStore: SessionStore };
export const sessionStore = globalForStore.sessionStore ?? new SessionStore();
if (process.env.NODE_ENV !== "production") {
  globalForStore.sessionStore = sessionStore;
}
