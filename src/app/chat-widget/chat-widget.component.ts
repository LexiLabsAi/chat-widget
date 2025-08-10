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
import { ChatService, ChatMessage } from './chat.service';
import { LoadingAnimationComponent } from '../loading-animation/loading-animation.component';

@Component({
  selector: 'lexi-chat-widget-internal',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingAnimationComponent],
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

  keydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }
}
