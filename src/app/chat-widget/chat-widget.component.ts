import {
  Component,
  Input,
  signal,
  effect,
  ViewEncapsulation,
  HostBinding,
  ViewChild,
  ElementRef,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../services/chat.service';
import { LoadingAnimationComponent } from '../loading-animation/loading-animation.component';
import { HttpClientModule } from '@angular/common/http';
import { SignalRChatService } from '../services/signalr-chat.service';
import { WidgetTokenHttpService } from '../services/widget-token-http.service';
import { ChatMessageDto } from '../types/interfaces/chat-message.dto.interface';
// add this near the top of the class
type ChatMsgWithTs = ChatMessage & { ts?: number };

@Component({
  selector: 'lexi-chat-widget-internal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingAnimationComponent,
    HttpClientModule,
  ],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class ChatWidgetComponent implements OnInit, AfterViewInit {
  @Input() apiUrl = '';
  @Input() companyId = '';
  @Input() theme: 'dark' | 'light' = 'dark';
  @Input() position: 'right' | 'left' = 'right';

  @HostBinding('attr.data-theme') get themeAttr() {
    return this.theme;
  }
  @HostBinding('attr.data-position') get posAttr() {
    return this.position;
  }

  @ViewChild(LoadingAnimationComponent) loader?: LoadingAnimationComponent;

  @ViewChild('log') log?: ElementRef<HTMLElement>;
  @ViewChild('input') inputEl?: ElementRef<HTMLTextAreaElement>;

  open = signal(false);
  sending = signal(false);
  // renamed from `input` to avoid clashes with the template ref
  text = signal('');

  // display name & avatar initial
  assistantName = 'Lexi · AI Assistant';
  assistantInitial = 'L';

  /** Optional input to override defaults later */
  @Input() suggestionChips: string[] | null = null;

  newMessage = '';

  private tenantId = '';
  token?: string;

  conversationId: string = '';
  userId: string = '';

  lastCount = 0;

  /** Generic legal/SMB defaults */
  private readonly defaultSuggestions: string[] = [
    // 'What services do you offer?',
    // 'What are your hours and location?',
    // 'How soon can I schedule an appointment?',
    // 'Do you work with small businesses/startups?',
  ];

  messages = signal<any[]>([]);

  ngOnInit(): void {
    this._signalrChatService.messages$.subscribe((msgs) => {
      console.log(msgs);
      if (msgs && msgs.length > this.lastCount) {
        const newOnes = msgs.slice(this.lastCount);
        this.messages.update((m) => [
          ...m,
          ...newOnes.map((msg) => ({
            role: msg.senderId === this.userId ? 'user' : 'assistant',
            text: msg.text,
            timestamp: msg.timestamp,
          })),
        ]);
        this.lastCount = msgs.length;
        this.sending.set(false);
      }
    });

    this._signalrChatService.ack$.subscribe((msg) => {
      if (!msg) return;

      this.messages.update((m) => {
        if (m.length === 0) return m; // nothing to update

        // clone the array so Angular change detection triggers
        const updated = [...m];

        // clone the last message and patch the timestamp from the server
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          timestamp: msg.timestamp || msg.timestamp,
        };

        return updated;
      });
    });

    this._signalrChatService.conversationStarted$.subscribe(
      (res: { conversationId: string; userId: string }) => {
        if (res) {
          this.conversationId = res.conversationId;
          this.userId = res.userId;
          console.log('✅ Conversation started:', res);
        }
      }
    );
  }

  ngAfterViewInit(): void {
    // Wait a short tick to ensure Inputs are bound from iframe params
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);

      if (!this.companyId) {
        this.companyId = params.get('companyId') || '';
      }
      if (!this.apiUrl) {
        this.apiUrl = params.get('apiUrl') || '';
      }

      const origin = window.location.origin;
      this.tenantId = this.companyId?.trim();

      if (!this.tenantId) {
        console.error('❌ Missing companyId — cannot issue token');
        return;
      }

      console.log(`🏷 Using Tenant: ${this.tenantId}, Origin: ${origin}`);

      this._tokenHttpService.issueToken(this.tenantId, origin).subscribe({
        next: (res) => {
          this.token = res.token;
          console.log('🎫 Widget token issued');
          this._signalrChatService.connect(this.token).then(() => {
            this._signalrChatService.startConversation();
          });
        },
        error: (err) => {
          console.error('Error issuing widget token:', err);
        },
      });
    }, 0);
  }

  constructor(
    private chat: ChatService,
    private _signalrChatService: SignalRChatService,
    private _tokenHttpService: WidgetTokenHttpService
  ) {
    effect(() => {
      this.chat.configure({ apiUrl: this.apiUrl, companyId: this.companyId });
    });

    effect(() => {
      // react to changes and keep the log scrolled
      this.open();
      this.messages();
      setTimeout(() => this.scrollToBottom());
    });
  }

  private scrollToBottom() {
    const el = this.log?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  private focusInput() {
    const el = this.inputEl?.nativeElement;
    el?.focus();
  }

  toggle() {
    const opening = !this.open();
    this.open.set(opening);

    // ADD: Tell the parent loader to resize iframe
    window.parent?.postMessage(
      { type: opening ? 'lexi:open' : 'lexi:close' },
      '*'
    );

    if (opening) {
      this.loader?.startOpenSequence();
      if (!this.chat.hasLoadedContext()) {
        this.chat.loadContext().catch(() => {});
      }
      setTimeout(() => {
        this.scrollToBottom();
        this.focusInput();
      });
    } else {
      this.loader?.backToIdle();
    }
  }

  async send() {
    const value = this.text().trim();
    if (!value) return;

    const chatmsg: ChatMessageDto = {
      messageId: '',
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      senderId: '',
      text: value,
    };

    this.messages.update((m) => [...m, { role: 'user', text: value }]);
    this.text.set('');
    this.sending.set(true);
    this.scrollToBottom();
    if (value.trim()) {
      this._signalrChatService.sendMessage(chatmsg);
      this.newMessage = '';
    }
    // try {
    //   const reply = await this.chat.ask(value);
    //   await new Promise((r) => setTimeout(r, 1500)); // ← one-liner: keep bubbles visible longer
    //   this.messages.update((m) => [...m, { role: 'assistant', text: reply }]);
    //   this.scrollToBottom();
    // } catch {
    //   this.messages.update((m) => [
    //     ...m,
    //     {
    //       role: 'assistant',
    //       text: 'Sorry—something went wrong. Please try again.',
    //     },
    //   ]);
    // } finally {
    //   this.sending.set(false);
    //   setTimeout(() => this.focusInput());
    // }
  }

  get activeSuggestions(): string[] {
    return this.suggestionChips && this.suggestionChips.length
      ? this.suggestionChips
      : this.defaultSuggestions;
  }

  /** Only show when we have just the welcome message and not currently sending */
  showSuggestions(): boolean {
    return this.messages().length === 1 && !this.sending();
  }

  sendSuggestion(text: string) {
    this.text.set(text);
    this.send();
  }

  keydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  formatTime(m: any, ts?: string): string {
    console.log(ts);
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  formatDaystamp(): string {
    const first = this.messages()[0]?.ts ?? Date.now();
    const d = new Date(first);
    const today = new Date();
    const day =
      d.toDateString() === today.toDateString()
        ? 'Today'
        : d.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
    return `${day}, ${this.formatTime(this.messages()[0], first)}`;
  }
}
