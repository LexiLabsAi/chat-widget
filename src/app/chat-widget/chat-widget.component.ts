import {
  Component,
  Input,
  signal,
  effect,
  ViewEncapsulation,
  HostBinding,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../services/chat.service';
import { LoadingAnimationComponent } from '../loading-animation/loading-animation.component';
import { HttpClientModule } from '@angular/common/http';
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
export class ChatWidgetComponent {
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

  /** Generic legal/SMB defaults */
  private readonly defaultSuggestions: string[] = [
    'What services do you offer?',
    'What are your hours and location?',
    'How soon can I schedule an appointment?',
    'Do you work with small businesses/startups?',
  ];

  // seed with timestamp
  messages = signal<ChatMsgWithTs[]>([
    {
      role: 'assistant',
      text: 'Hi! Ask me anything about our services.',
      ts: Date.now(),
    },
  ]);

  constructor(private chat: ChatService) {
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

    // when sending user msg
    this.messages.update((m) => [
      ...m,
      { role: 'user', text: value, ts: Date.now() },
    ]);

    this.text.set('');
    this.sending.set(true);
    this.scrollToBottom();

    try {
      const reply = await this.chat.ask(value);
      // after getting reply (keep your delay line)
      await new Promise((r) => setTimeout(r, 1500));
      this.messages.update((m) => [
        ...m,
        { role: 'assistant', text: reply, ts: Date.now() },
      ]);

      this.scrollToBottom();
    } catch {
      this.messages.update((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'Sorry—something went wrong. Please try again.',
        },
      ]);
    } finally {
      this.sending.set(false);
      setTimeout(() => this.focusInput());
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

  formatTime(ts?: number): string {
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
    return `${day}, ${this.formatTime(first)}`;
  }
}
