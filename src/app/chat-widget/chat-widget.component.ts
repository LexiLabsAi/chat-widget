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

  /** Optional input to override defaults later */
  @Input() suggestionChips: string[] | null = null;

  /** Generic legal/SMB defaults */
  private readonly defaultSuggestions: string[] = [
    'What services do you offer?',
    'What are your hours and location?',
    'How soon can I schedule an appointment?',
    'Do you work with small businesses/startups?',
  ];

  messages = signal<ChatMessage[]>([
    { role: 'assistant', text: 'Hi! Ask me anything about our services.' },
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

    this.messages.update((m) => [...m, { role: 'user', text: value }]);
    this.text.set('');
    this.sending.set(true);
    this.scrollToBottom();

    try {
      const reply = await this.chat.ask(value);
      await new Promise((r) => setTimeout(r, 1500)); // ← one-liner: keep bubbles visible longer
      this.messages.update((m) => [...m, { role: 'assistant', text: reply }]);
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
}
