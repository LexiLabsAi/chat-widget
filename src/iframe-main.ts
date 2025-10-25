import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { ChatWidgetComponent } from './app/chat-widget/chat-widget.component';

function readParam(name: string, def = ''): string {
  const u = new URL(window.location.href);
  return u.searchParams.get(name) ?? def;
}

// ✅ Pre-set attributes before bootstrapping
const host = document.createElement('lexi-chat-widget-internal');
document.body.appendChild(host);

if (readParam('apiUrl')) host.setAttribute('api-url', readParam('apiUrl'));
if (readParam('companyId'))
  host.setAttribute('company-id', readParam('companyId'));
host.setAttribute('theme', readParam('theme', 'dark'));
host.setAttribute('position', readParam('position', 'right'));
host.setAttribute('embedded', '1'); // ✅ this must exist BEFORE bootstrap

bootstrapApplication(ChatWidgetComponent, {
  providers: [provideHttpClient()],
}).then(() => {
  // Angular will hydrate the existing element instead of creating a new one
  window.parent?.postMessage({ type: 'lexi:ready' }, '*');
});
