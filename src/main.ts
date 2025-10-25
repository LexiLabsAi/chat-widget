import 'zone.js';
import '@webcomponents/custom-elements/custom-elements.min';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Injector } from '@angular/core';
import { createCustomElement } from '@angular/elements';

import { ChatWidgetComponent } from './app/chat-widget/chat-widget.component';
import { AppModule } from './app/app.module';

// Bootstrap the Angular module, then define the custom element
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .then((moduleRef) => {
    const injector = moduleRef.injector as Injector;
    if (!customElements.get('lexi-chat-widget')) {
      const WidgetElement = createCustomElement(ChatWidgetComponent, {
        injector,
      });
      customElements.define('lexi-chat-widget', WidgetElement);
    }
  })
  .catch((err) => console.error(err));

document.addEventListener('DOMContentLoaded', () => {
  const d = document;
  d.documentElement.style.height = '100%';
  d.body.style.height = '100%';
  d.body.style.margin = '0';
});
