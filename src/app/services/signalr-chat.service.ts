// signalr-chat.service.ts
import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { ChatMessageDto } from '../types/interfaces/chat-message.dto.interface';
import { PresenceDto } from '../types/interfaces/presence.dto.interface';
import { StartConversationRequest } from '../types/interfaces/start-conversation-request.interface';
import { TypingDto } from '../types/interfaces/typing.dto.interface';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SignalRChatService {
  private hubConnection?: signalR.HubConnection;

  connectionState$ = new BehaviorSubject<
    'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'
  >('connecting');

  // store context for later sends
  private context: {
    tenantId?: string;
    conversationId?: string;
    userId?: string;
  } = {};

  private messagesSource = new BehaviorSubject<ChatMessageDto[]>([]);
  messages$ = this.messagesSource.asObservable();

  private presenceSource = new BehaviorSubject<PresenceDto | null>(null);
  presence$ = this.presenceSource.asObservable();

  private conversationStartedSource = new BehaviorSubject<any | null>(null);
  conversationStarted$ = this.conversationStartedSource.asObservable();

  private ackSource = new BehaviorSubject<any | null>(null);
  ack$ = this.ackSource.asObservable();

  constructor() {}

  connect(token: string, chatSettingsId: string) {
    console.log('signalr url: ' + environment.BASE_SIGNALR_URL);
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(
        `${environment.BASE_SIGNALR_URL}/widgethub?chatSettingsId=${chatSettingsId}`,
        {
          accessTokenFactory: () => token,
        }
      )
      .withAutomaticReconnect() // retry automatically
      .build();

    // 🟡 Connection lifecycle handlers (place them right here)
    this.hubConnection.onreconnecting((error) => {
      console.warn('🔄 Reconnecting...', error);
      this.connectionState$.next('reconnecting');

      // 👉 reset typing again just to be safe
      window.dispatchEvent(new CustomEvent('lexi:typing-reset'));
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('✅ Reconnected, new connectionId:', connectionId);
      this.connectionState$.next('connected');

      // 👉 reset typing again just to be safe
      window.dispatchEvent(new CustomEvent('lexi:typing-reset'));

      // Rejoin existing conversation group if one exists
      if (this.context.tenantId && this.context.conversationId) {
        this.join(this.context.tenantId, this.context.conversationId)
          ?.then(() => console.log('🔁 Rejoined conversation after reconnect'))
          .catch((err) => console.error('Failed to rejoin conversation:', err));
      }
    });

    this.hubConnection.onclose((error) => {
      console.warn('❌ Disconnected from SignalR', error);
      this.connectionState$.next('disconnected');
    });

    // 🟢 Start connection and register handlers after it's connected
    this.connectionState$.next('connecting');

    return this.hubConnection
      .start()
      .then(() => {
        console.log('✅ Hub connected');
        this.connectionState$.next('connected');
        this.registerHandlers();
      })
      .catch((err) => {
        console.error('💥 Connection failed:', err);
        this.connectionState$.next('error');
      });
  }

  private registerHandlers() {
    if (!this.hubConnection) return;

    this.hubConnection.on('MessageReceived', (msg: ChatMessageDto) => {
      const current = this.messagesSource.value;
      this.messagesSource.next([...current, msg]);

      // if conversationComplete flag is present
      if (msg.metadata && msg.metadata['conversationComplete'] === 'true') {
        console.log('👋 Conversation marked complete by server');
        this.connectionState$.next('disconnected'); // intentionally end chat
        this.hubConnection?.stop(); // optional
      }
    });

    this.hubConnection.on('PresenceUpdated', (presence: PresenceDto) => {
      this.presenceSource.next(presence);
    });

    this.hubConnection.on('TypingUpdated', (dto: TypingDto) => {});

    this.hubConnection.on(
      'Ack',
      (action: string, data: any, success: boolean, error: string) => {
        if (action === 'SendMessage' && success && data) {
          // The server sent back the full ChatMessageDto with timestamp
          const msg = data as ChatMessageDto;

          // ✅ Emit through ackSource
          this.ackSource.next(msg);
        }
      }
    );

    this.hubConnection.on(
      'ConversationStarted',
      (req: StartConversationRequest) => {
        this.context = {
          tenantId: req.tenantId,
          conversationId: req.conversationId,
          userId: req.userId,
        };
        this.conversationStartedSource.next(req);
      }
    );

    this.hubConnection.on(
      'ConversationEnded',
      (conversationId: string, closingText: string) => {
        console.log('👋 Conversation ended:', conversationId, closingText);

        // Push Lexi's closing message to the message stream
        const closingMsg: ChatMessageDto = {
          messageId: '-1',
          tenantId: this.context.tenantId ?? '',
          conversationId,
          senderId: 'ai-bot',
          text: closingText,
          timestamp: new Date().toISOString(),
        };

        const current = this.messagesSource.value;
        this.messagesSource.next([...current, closingMsg]);

        // End connection gracefully after a short delay
        setTimeout(() => {
          this.connectionState$.next('disconnected');
          this.hubConnection?.stop();
        }, 2000);
      }
    );
  }

  // === HUB METHODS ===
  sendMessage(msg: ChatMessageDto) {
    const newMsg = {
      messageId: crypto.randomUUID(),
      tenantId: this.context.tenantId ?? '',
      conversationId: this.context.conversationId ?? '',
      senderId: this.context.userId ?? '',
      text: msg.text,
    };

    return this.hubConnection?.invoke('SendMessage', newMsg);
  }

  typing(dto: TypingDto) {
    return this.hubConnection?.invoke('Typing', dto);
  }

  join(tenantId: string, conversationId: string) {
    return this.hubConnection?.invoke('Join', tenantId, conversationId);
  }

  startConversation() {
    return this.hubConnection?.invoke('StartConversation');
  }

  disconnect() {
    this.hubConnection
      ?.stop()
      .catch((err) => console.error('Hub stop failed', err));
    this.connectionState$.next('disconnected');
  }
}
