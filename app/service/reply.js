const Service = require('egg').Service;

class ReplyService extends Service {
  /*
   * 根据回复ID，获取回复
   * @param {String} id 回复ID
   * @return {Promise[reply]} 承载 replay 的 Promise 对象
   */
  async getReplyById(id) {
    if (!id) return null;

    const reply = this.ctx.model.Reply.findOne({ _id: id }).exec();

    if (!reply) return null;

    const author_id = reply.author_id;
    const author = await this.service.user.getUserById(author_id);

    reply.author = author;

    return reply;
  }
}

module.exports = ReplyService;
