import { Message } from 'discord.js';
import { Context as TelegramContext } from 'telegraf';

import { AdminUser, Context, TelegramUser, User } from '@/models';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { BotModuleId, ContextData, OwnerType, Transport } from '@/types';
import { ModuleList } from '@/modules';
import { BotError } from '@/controllers/botError';

type RawType<T> = T extends Transport.Discord
  ? Message<boolean>
  : T extends Transport.Telegram
  ? TelegramContext
  : unknown;

// TODO
export enum MessageType {
  TEXT = 'text',
  REPLY = 'reply',
  REPOST = 'repost',
  PHOTO = 'photo',
}

/*
 * Check example:

  if (message.transport === Transport.Telegram) {
    const telegramMessage = (message as BaseMessage<Transport.Telegram>).raw;
  }
*/

export abstract class BaseMessage<T extends Transport | unknown = unknown> {
  private transportType: Transport;
  private messageBuilder: MessageBuilder;
  private isMessageProcessed: boolean = false;
  private isMessageInterrupted: boolean = false;

  constructor(transport: Transport) {
    this.transportType = transport;
  }

  get transport(): Transport {
    return this.transportType;
  }

  abstract get raw(): RawType<T>;

  abstract get type(): MessageType;
  abstract get content(): string;
  abstract get photo(): any;
  abstract get fromId(): string;
  abstract get chatId(): string | null;
  abstract get isGroup(): boolean;

  abstract reply(text: string): Promise<any>;
  abstract replyWithMarkdown(text: string): Promise<any>;

  abstract getUser(): Promise<TelegramUser | User | null>;
  abstract getUserNameById(id: string | number): Promise<string>;
  abstract getAdmin(): Promise<AdminUser | null>;

  abstract getContextOwner(): { owner: string; ownerType: OwnerType };

  get isProcessed() {
    return this.isMessageProcessed;
  }

  get isInterrupted() {
    return this.isMessageInterrupted;
  }

  markProcessed() {
    this.isMessageProcessed = true;
  }

  markInterrupted() {
    this.isMessageInterrupted = true;
  }

  getMessageBuilder() {
    if (!this.messageBuilder) {
      this.messageBuilder = new MessageBuilder(this);
    }

    return this.messageBuilder;
  }

  async getContext(moduleId: BotModuleId, chatId: string = null) {
    const { owner, ownerType } = this.getContextOwner();

    const defaultContextData = ModuleList.find((module) => module.id === moduleId).contextData;

    if (!defaultContextData) {
      return null;
    }

    const [context] = await Context.findOrCreate({
      where: { owner, ownerType, module: moduleId, chatId },
      defaults: { data: defaultContextData },
    });

    // TODO: Check context data and update if needed. Later: migrations

    return context;
  }

  async getContextList(moduleId: BotModuleId, chatId: string = null) {
    const { ownerType } = this.getContextOwner();

    const contextList = await Context.findAll({
      where: { ownerType, module: moduleId, chatId },
    });

    return contextList;
  }

  async getModuleData<T extends ContextData>(moduleId: BotModuleId) {
    const context = await this.getContext(moduleId);

    if (!context) {
      return null;
    }

    return context.data as T;
  }

  async getLocalModuleData<T extends ContextData>(moduleId: BotModuleId) {
    if (!this.chatId) {
      throw new BotError('Unknown error');
    }

    const context = await this.getContext(moduleId, this.chatId);

    if (!context) {
      return null;
    }

    return context.data as T;
  }

  async getAllLocalModuleData<T extends ContextData>(moduleId: BotModuleId) {
    if (!this.chatId) {
      throw new BotError('Unknown error');
    }

    const contextList = await this.getContextList(moduleId, this.chatId);

    if (!Array.isArray(contextList)) {
      return null;
    }

    return contextList.map((context) => context as Context<T>);
  }

  async setModuleData<T extends ContextData>(moduleId: BotModuleId, data: T) {
    const context = await this.getContext(moduleId);

    if (!context) {
      return null;
    }

    const result = await context.update({ data });

    return result.data as T;
  }

  async setLocalModuleData<T extends ContextData>(moduleId: BotModuleId, data: T) {
    if (!this.chatId) {
      throw new BotError('Unknown error');
    }

    const context = await this.getContext(moduleId, this.chatId);

    if (!context) {
      return null;
    }

    const result = await context.update({ data });

    return result.data as T;
  }

  async setModuleDataPartial<T extends ContextData>(moduleId: BotModuleId, data: Partial<T>) {
    const context = await this.getContext(moduleId);

    if (!context) {
      return null;
    }

    const result = await context.update({ data: { ...context.data, ...data } });

    return result.data as T;
  }
}
