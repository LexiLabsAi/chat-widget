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
  OnDestroy,
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
export class ChatWidgetComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() apiUrl = '';
  @Input() companyId = '';
  @Input() theme: 'dark' | 'light' = 'dark';
  @Input() position: 'right' | 'left' = 'right';
  @Input() hostSite = '';

  @HostBinding('attr.data-theme') get themeAttr() {
    return this.theme;
  }
  @HostBinding('attr.data-position') get posAttr() {
    return this.position;
  }

  // NEW: automatically mark when running inside an iframe
  private readonly inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();
  @HostBinding('attr.embedded') get embeddedAttr() {
    return this.inIframe ? '1' : null;
  }

  private setEmbeddedAttrIfIframe() {
    let isIframe = true;
    try {
      isIframe = window.self !== window.top;
    } catch {
      isIframe = true;
    }
    if (isIframe) {
      this.host.nativeElement.setAttribute('embedded', '1');
    } else {
      this.host.nativeElement.removeAttribute('embedded');
    }
  }

  @ViewChild(LoadingAnimationComponent) loader?: LoadingAnimationComponent;

  @ViewChild('log') log?: ElementRef<HTMLElement>;
  @ViewChild('input') inputEl?: ElementRef<HTMLTextAreaElement>;

  open = signal(false);
  sending = signal(false);
  ended = signal(false);
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

  private isConnected = false;

  private connecting = false;

  connectionState = signal<'connecting' | 'connected' | 'error'>('connecting');

  ngOnDestroy(): void {
    this._signalrChatService.disconnect();
    if (this.inIframe) {
      window.removeEventListener('message', this.messageHandler);
    }
  }

  ngOnInit(): void {
    this.setEmbeddedAttrIfIframe();

    if (this.inIframe) {
      window.addEventListener('message', this.messageHandler);
    }

    // ✅ Handle iOS keyboard
    if (this.inIframe && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      window.visualViewport?.addEventListener('resize', () => {
        const vvHeight = window.visualViewport?.height || window.innerHeight;
        document.documentElement.style.setProperty(
          '--vh',
          `${vvHeight * 0.01}px`
        );
      });
    }

    // 👇 Reset typing if connection drops or reconnects
    window.addEventListener('lexi:typing-reset', () => {
      console.log('🧹 Resetting typing indicator');
      this.sending.set(false);
    });

    this._signalrChatService.connectionState$.subscribe((state) => {
      switch (state) {
        case 'connecting':
        case 'reconnecting':
          this.connectionState.set('connecting');
          break;
        case 'connected':
          this.connectionState.set('connected');
          break;
        case 'disconnected':
          this.ended.set(true);
          setTimeout(() => this.scrollToBottom(), 50);
          break;
        case 'error':
          this.connectionState.set('error');
          break;
      }
    });

    this._signalrChatService.messages$.subscribe((msgs) => {
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

        setTimeout(() => {
          this.scrollToBottom();
          this.focusInput();
        }, 50);
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
    this.setEmbeddedAttrIfIframe();
    // Wait a short tick to ensure Inputs are bound from iframe params
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);

      if (!this.companyId) {
        this.companyId = params.get('companyId') || '';
      }
      if (!this.apiUrl) {
        this.apiUrl = params.get('apiUrl') || '';
      }

      const origin = this.resolveOrigin();

      if (!origin) {
        console.error(
          '❌ Missing origin. Checked window.location, document.referrer, and hostSite param.'
        );
        this.connectionState.set('error');
        return;
      }

      this.tenantId = this.companyId?.trim();

      if (!this.tenantId) {
        console.error('❌ Missing companyId — cannot issue token');
        return;
      }

      console.log(`🏷 Using Tenant: ${this.tenantId}, Origin: ${origin}`);

      // this._tokenHttpService.issueToken(this.tenantId, origin).subscribe({
      //   next: (res) => {
      //     this.token = res.token;
      //     console.log('🎫 Widget token issued');
      //     this._signalrChatService
      //       .connect(this.token, this.tenantId)
      //       .then(() => {
      //         this._signalrChatService.startConversation();
      //       });
      //   },
      //   error: (err) => {
      //     console.error('Error issuing widget token:', err);
      //   },
      // });
    }, 0);
  }

  constructor(
    private chat: ChatService,
    private _signalrChatService: SignalRChatService,
    private _tokenHttpService: WidgetTokenHttpService,
    private host: ElementRef<HTMLElement>
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

  private readonly messageHandler = (event: MessageEvent) => {
    const data = event?.data;
    if (!data || typeof data !== 'object') return;

    const type = data.type;
    if (type === 'lexi:open') {
      if (!this.open()) {
        this.open.set(true);
        this.connectIfNeeded();
        setTimeout(() => {
          this.scrollToBottom();
          this.focusInput();
        });
      }
    } else if (type === 'lexi:close') {
      if (this.open()) {
        this.open.set(false);
      }
    }
  };

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

      // ⬇️ connect only when opened
      this.connectIfNeeded();

      setTimeout(() => {
        this.scrollToBottom();
        this.focusInput();
      });
    } else {
      this.loader?.backToIdle();
    }

    // if (opening) {
    //   this.loader?.startOpenSequence();
    //   if (!this.chat.hasLoadedContext()) {
    //     this.chat.loadContext().catch(() => {});
    //   }
    //   setTimeout(() => {
    //     this.scrollToBottom();
    //     this.focusInput();
    //   });
    // } else {
    // this.loader?.backToIdle();
    //}
  }

  async send() {
    if (this.ended()) {
      console.log('💬 Chat ended — starting a new conversation...');
      this.ended.set(false);
      this._signalrChatService.startConversation();
      return;
    }

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

  private tryTopLevelOrigin(): string | null {
    try {
      return window.location?.origin ?? null;
    } catch {
      return null;
    }
  }

  private tryOriginFromReferrer(): string | null {
    try {
      return document.referrer ? new URL(document.referrer).origin : null;
    } catch {
      return null;
    }
  }

  private tryOriginFromHostSiteParam(): string | null {
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('hostSite');
      if (!v) return null;

      const normalized = v.includes('://') ? v : `https://${v}`;
      return new URL(normalized).origin;
    } catch {
      return null;
    }
  }

  private resolveOrigin(): string | null {
    return (
      (!this.inIframe && this.tryTopLevelOrigin()) ||
      this.tryOriginFromReferrer() ||
      this.tryOriginFromHostSiteParam()
    );
  }

  private async connectIfNeeded(): Promise<void> {
    if (this.isConnected || this.connecting) {
      return;
    }

    if (!this.tenantId /*|| !this.apiUrl*/) {
      console.log('Missing tenantId or apiUrl');
      return;
    }

    this.connecting = true;
    console.log('Connecting to chat hub...');

    const origin = this.resolveOrigin();

    if (!origin) {
      console.error(
        '❌ Missing origin. Checked window.location, document.referrer, and hostSite param.'
      );
      this.connectionState.set('error');
      return;
    }

    this._tokenHttpService.issueToken(this.tenantId, origin).subscribe({
      next: (res) => {
        this.token = res.token;
        console.log('Widget token issued');

        this._signalrChatService
          .connect(this.token!, this.companyId)
          .then(() => {
            this.connectionState.set('connected');
            this._signalrChatService.startConversation();
          })
          .catch((err) => {
            console.error('Hub connection failed:', err);
            this.connectionState.set('error');
          });
      },
      error: (err) => {
        console.error('Error issuing widget token: ', err);
        this.connectionState.set('error');
      },
    });
  }
}
