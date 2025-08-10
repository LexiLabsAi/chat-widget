import { Injectable } from '@angular/core';

export type ChatMessage = { role: 'user' | 'assistant'; text: string };

type Config = { apiUrl: string; companyId: string };

@Injectable({ providedIn: 'root' })
export class ChatService {
  private cfg: Config | null = null;
  private contextLoaded = false;

  configure(cfg: Config) {
    this.cfg = cfg;
  }

  hasLoadedContext() {
    return this.contextLoaded;
  }

  async loadContext() {
    if (!this.cfg?.apiUrl) {
      // dev no-op
      this.contextLoaded = true;
      return;
    }
    await fetch(
      `${this.cfg.apiUrl}/chat/context?companyId=${encodeURIComponent(
        this.cfg.companyId
      )}`,
      {
        credentials: 'include',
      }
    ).then((r) => (r.ok ? r.json() : Promise.reject(r)));
    this.contextLoaded = true;
  }

  async ask(userText: string): Promise<string> {
    // DEV stub when apiUrl is not set
    if (!this.cfg?.apiUrl) {
      await new Promise((r) => setTimeout(r, 500));
      return `Demo reply (FAQ-grounded): I heard “${userText}”.`;
    }

    const res = await fetch(`${this.cfg.apiUrl}/chat/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        companyId: this.cfg.companyId,
        message: userText,
        stream: false,
      }),
    });
    if (!res.ok) throw new Error('Bad response');
    const data = await res.json();
    return data.reply ?? '…';
  }
}
