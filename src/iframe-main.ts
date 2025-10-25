import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { ChatWidgetComponent } from './app/chat-widget/chat-widget.component';

function readParam(name: string, def = ''): string {
  const u = new URL(window.location.href);
  return u.searchParams.get(name) ?? def;
}

bootstrapApplication(ChatWidgetComponent, {
  providers: [provideHttpClient()],
}).then(() => {
  // Set inputs on the custom element via attributes
  const host = document.querySelector(
    'lexi-chat-widget-internal'
  ) as HTMLElement | null;
  if (host) {
    if (readParam('apiUrl')) host.setAttribute('api-url', readParam('apiUrl'));
    if (readParam('companyId'))
      host.setAttribute('company-id', readParam('companyId'));
    host.setAttribute('theme', readParam('theme', 'dark'));
    host.setAttribute('position', readParam('position', 'right'));
    host.setAttribute('embedded', '1');
    if (readParam('embedded')) host.setAttribute('embedded', '1');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const launcher = document.querySelector('.lexi-launcher');
    if (launcher) launcher.remove(); // safety: kill internal launcher if any slipped through
  });

  // Tell parent we’re alive
  window.parent?.postMessage({ type: 'lexi:ready' }, '*');
});
