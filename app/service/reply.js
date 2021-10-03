const Service = require('egg').Service;

class ReplyService extends Service {
  /*
   * 根据回复ID，获取回复
   * @param {String} id 回复ID
   * @return {Promise[reply]} 承载 replay 的 Promise 对象
   */
  async getReplyById(id) {
    if (!id) return null;

    const reply = await this.ctx.model.Reply.findOne({ _id: id }).exec();

    if (!reply) return null;

    const author_id = reply.author_id;
    const author = await this.service.user.getUserById(author_id);

    reply.author = author;

    return reply;
  }

  getRepliesByAuthorId(authorId, opt = null) {
    return this.ctx.model.Reply.find({ author_id: authorId }, {}, opt).exec();
  }

  /*
   * 根据主题ID，获取回复列表
   * Callback:
   * - err, 数据库异常
   * - replies, 回复列表
   * @param {String} id 主题ID
   * @return {Promise[replies]} 承载 replay 列表的 Promise 对象
   */
  async getRepliesByTopicId(id) {
    const query = { topic_id: id, deleted: false };
    let replies = await this.ctx.model.Reply.find(query, '', {
      sortby: 'create_at',
    }).exec();

    if (!replies.length) return [];

    replies = replies.filter(item => !item.content_is_html);

    return Promise.all(
      replies.map(async reply => {
        const author = await this.ctx.service.user.getUserById(reply.author_id);
        reply.author = author || { _id: '' };
        reply.content = await this.ctx.service.at.linkUsers(reply.content);
        return reply;
      })
    );
  }

  /*
   * 创建并保存一条回复信息
   * @param {String} content 回复内容
   * @param {String} topicId 主题ID
   * @param {String} authorId 回复作者
   * @param {String} [replyId] 回复ID，当二级回复时设定该值
   * @return {Promise} 承载 replay 列表的 Promise 对象
   */
  async newAndSave(content, topicId, authorId, replyId = null) {
    const reply = new this.ctx.model.Reply();
    reply.content = content;
    reply.topic_id = topicId;
    reply.author_id = authorId;

    if (replyId) {
      reply.reply_id = replyId;
    }

    await reply.save();

    return reply;
  }


  /*
   * 根据topicId查询到最新的一条未删除回复
   * @param topicId 主题ID
   * @return {Promise[reply]} 承载 reply 的 Promise 对象
   */
  getLastReplyByTopId(topicId) {
    const query = { topic_id: topicId, deleted: false };
    const opts = { sort: { create_at: -1 }, limit: 1 };
    return this.ctx.model.Reply.findOne(query, '_id', opts).exec();
  }
}

module.exports = ReplyService;
