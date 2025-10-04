import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  text: string;
}

type MockRule = { triggers: string[]; reply: string };

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = '';
  private companyId = '';
  private contextLoaded = false;

  // keyword rules file (see below)
  private readonly mockRulesUrl = 'assets/mock-data/chat/lexi-replies.json';

  constructor(private http: HttpClient) {}

  configure(opts: { apiUrl: string; companyId: string }) {
    this.apiUrl = opts.apiUrl;
    this.companyId = opts.companyId;
  }

  hasLoadedContext() {
    return this.contextLoaded;
  }

  async loadContext(): Promise<void> {
    await new Promise((r) => setTimeout(r, 80));
    this.contextLoaded = true;
  }

  async ask(userText: string): Promise<string> {
    if (environment.USE_MOCK_API) {
      try {
        const rules = await firstValueFrom(
          this.http.get<MockRule[]>(this.mockRulesUrl)
        );
        const normalized = userText.toLowerCase().trim();

        // find first rule whose trigger appears in the text
        const hit = rules.find((rule) =>
          rule.triggers.some((t) => normalized.includes(t.toLowerCase()))
        );

        if (hit) return hit.reply;

        // no rule matched: give a sensible generic mock
        return `Got it. You said: “${userText}”. (mock)`;
      } catch {
        // if the file is missing, still return something
        return `Got it. You said: “${userText}”. (mock)`;
      }
    }

    // real API (later)
    const res: any = await firstValueFrom(
      this.http.post(`${this.apiUrl}/chat`, {
        companyId: this.companyId,
        text: userText,
      })
    );
    return res?.reply ?? '…';
  }
}
