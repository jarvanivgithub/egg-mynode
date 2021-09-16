const Controller = require('egg').Controller;

class MessageController extends Controller {
  async index() {
    const { ctx } = this;
    const userId = ctx.user._id;
    const msgService = ctx.service.message;
    const [ readMessageResults, unreadMessageResults ] = await Promise.all([
      msgService.getReadMessagesByUserId(userId),
      msgService.getUnreadMessagesByUserId(userId),
    ]);
    const hasReadMessages = await Promise.all(readMessageResults.map(async message => await msgService.getMessageRelations(message)));
    const hasUnreadMessages = await Promise.all(unreadMessageResults.map(async message => await msgService.getMessageRelations(message)));

    // 将所有未读消息标记为已读
    await msgService.updateMessagesToRead(userId, unreadMessageResults);
    await ctx.render('message/index', {
      has_read_messages: hasReadMessages,
      hasnot_read_messages: hasUnreadMessages,
    }, {
      layout: 'layout.html',
    });
  }
}

module.exports = MessageController;
