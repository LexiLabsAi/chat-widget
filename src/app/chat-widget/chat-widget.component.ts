import {
  Component,
  Input,
  signal,
  effect,
  ViewEncapsulation,
  HostBinding,
  ViewChild,
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

  open = signal(false);
  sending = signal(false);
  input = signal('');

  messages = signal<ChatMessage[]>([
    { role: 'assistant', text: 'Hi! Ask me anything about our services.' },
  ]);

  constructor(private chat: ChatService) {
    effect(() => {
      this.chat.configure({ apiUrl: this.apiUrl, companyId: this.companyId });
    });
  }

  toggle() {
    const opening = !this.open();
    this.open.set(opening);

    if (opening) {
      this.loader?.startOpenSequence();
      if (!this.chat.hasLoadedContext()) {
        this.chat.loadContext().catch(() => {});
      }
    } else {
      this.loader?.backToIdle();
    }
  }

  async send() {
    const text = this.input().trim();
    if (!text) return;

    this.messages.update((m) => [...m, { role: 'user', text }]);
    this.input.set('');
    this.sending.set(true);

    try {
      const reply = await this.chat.ask(text);
      this.messages.update((m) => [...m, { role: 'assistant', text: reply }]);
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
    }
  }

  keydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }
}
