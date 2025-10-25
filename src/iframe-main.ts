import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { ChatWidgetComponent } from './app/chat-widget/chat-widget.component';

function readParam(name: string, def = ''): string {
  const u = new URL(window.location.href);
  return u.searchParams.get(name) ?? def;
}

// ✅ Pre-create the element and set embedded attribute before bootstrap
const host = document.createElement('lexi-chat-widget-internal');
document.body.appendChild(host);

if (readParam('apiUrl')) host.setAttribute('api-url', readParam('apiUrl'));
if (readParam('companyId'))
  host.setAttribute('company-id', readParam('companyId'));
host.setAttribute('theme', readParam('theme', 'dark'));
host.setAttribute('position', readParam('position', 'right'));
host.setAttribute('embedded', '1'); // critical — tells Angular it's inside iframe

bootstrapApplication(ChatWidgetComponent, {
  providers: [provideHttpClient()],
}).then(() => {
  // Inform parent that iframe is ready
  window.parent?.postMessage({ type: 'lexi:ready' }, '*');
});
