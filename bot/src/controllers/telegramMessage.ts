import { Context } from 'telegraf';
import { Update } from 'typegram';
import { PropOr } from 'telegraf/typings/deunionize';
import * as tt from 'telegraf/typings/telegram-types';

import { AdminUser, TelegramUser } from '@/models';
import { DataOwner, OwnerType, Transport } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';

export class TelegramMessage extends BaseMessage<Transport.Telegram> {
  private telegramMessage: Context;

  constructor(telegramMessage: Context) {
    super(Transport.Telegram);
    this.telegramMessage = telegramMessage;
  }

  get raw() {
    return this.telegramMessage;
  }

  get content() {
    const message = this.message as any;

    if (typeof message?.text !== 'string') {
      return '';
    }
    return message.text;
  }

  get isGroup() {
    return this.telegramMessage.chat.type === 'group';
  }

  // Custom begin

  get message(): PropOr<Update, 'message'> {
    return this.telegramMessage.message;
  }

  // Custom end

  reply(text: string, extra?: tt.ExtraReplyMessage) {
    console.log('reply called with text: %j, extra: %j', text, extra);
    return this.telegramMessage.reply(text, extra);
  }

  replyWithMarkdown(text: string, extra?: tt.ExtraReplyMessage) {
    console.log('reply called with text: %j, extra: %j', text, extra);
    return this.telegramMessage.replyWithMarkdownV2(text, extra);
  }

  getContextOwner(): { owner: string; ownerType: OwnerType } {
    return { owner: `${this.message.from.id}`, ownerType: DataOwner.telegramUser };
  }

  async getUser(): Promise<TelegramUser | null> {
    try {
      return await TelegramUser.findByPk(this.message?.from?.id);
    } catch (err) {
      return null;
    }
  }

  async getUserNameById(id: string | number): Promise<string> {
    try {
      const chatId = Number.parseInt(this.getChatId(), 10);
      const userId = typeof id === 'number' ? id : Number.parseInt(id, 10);
      const member = await this.telegramMessage.telegram.getChatMember(chatId, userId);
      const userName = [member.user.first_name, member.user.last_name].join(' ');
      return userName || id.toString();
    } catch (err) {
      return id?.toString() || 'Ghost';
    }
  }

  async getAdmin(): Promise<AdminUser | null> {
    try {
      const telegramUser = await TelegramUser.findByPk(this.message?.from?.id, { include: [AdminUser] });
      return telegramUser.admin;
    } catch (err) {
      return null;
    }
  }

  getChatId(): string | null {
    return this.telegramMessage.chat.id ? this.telegramMessage.chat.id.toString() : null;
  }
}
