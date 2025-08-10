import { Injector, NgModule, DoBootstrap } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatWidgetComponent } from './chat-widget/chat-widget.component';

@NgModule({
  imports: [CommonModule, FormsModule, ChatWidgetComponent],
})
export class ElementsModule implements DoBootstrap {
  constructor(private injector: Injector) {}

  ngDoBootstrap() {
    const Elem = createCustomElement(ChatWidgetComponent, {
      injector: this.injector,
    });
    if (!customElements.get('lexi-chat-widget')) {
      customElements.define('lexi-chat-widget', Elem);
    }
  }
}
