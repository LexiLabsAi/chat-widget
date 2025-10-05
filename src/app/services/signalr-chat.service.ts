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

  connect(token: string) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.BASE_SIGNALR_URL}/widgethub`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    return this.hubConnection.start().then(() => {
      console.log('✅ Hub connected');
      this.registerHandlers();
    });
  }

  private registerHandlers() {
    if (!this.hubConnection) return;

    this.hubConnection.on('MessageReceived', (msg: ChatMessageDto) => {
      const current = this.messagesSource.value;
      this.messagesSource.next([...current, msg]);
    });

    this.hubConnection.on('PresenceUpdated', (presence: PresenceDto) => {
      this.presenceSource.next(presence);
    });

    this.hubConnection.on('TypingUpdated', (dto: TypingDto) => {
      console.log('Typing:', dto);
    });

    this.hubConnection.on(
      'Ack',
      (action: string, data: any, success: boolean, error: string) => {
        console.log(
          `Ack for ${action}: ${success ? '✅' : '❌'} ${error || ''}`
        );

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
  }

  // === HUB METHODS ===
  sendMessage(msg: ChatMessageDto) {
    console.log(this.context);
    const newMsg = {
      messageId: crypto.randomUUID(),
      tenantId: this.context.tenantId ?? '',
      conversationId: this.context.conversationId ?? '',
      senderId: this.context.userId ?? '',
      text: msg.text,
    };

    console.log(newMsg);
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
}
