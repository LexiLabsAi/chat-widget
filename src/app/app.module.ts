import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ChatWidgetComponent } from './chat-widget/chat-widget.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule, ChatWidgetComponent],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
