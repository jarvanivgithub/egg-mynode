const Service = require('egg').Service;

class MessageService extends Service {
  /*
   * 根据用户ID，获取未读消息的数量
   * Callback:
   * @param {String} id 用户ID
   * @return {Promise[messagesCount]} 承载消息列表的 Promise 对象
   */
  async getMessagesCount(id) {
    return this.ctx.model.Message.count({
      master_id: id,
      has_read: true,
    }).exec();
  }
}

module.exports = MessageService;
