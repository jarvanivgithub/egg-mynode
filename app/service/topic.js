const Service = require('egg').Service;

class TopicService extends Service {
  /*
   * 根据关键词，获取主题列表
   * @param {String} query 搜索关键词
   * @param {Object} opt 搜索选项
   */
  async getTopicsByQuery(query, opt) {
    query.deleted = false;
    const topics = await this.ctx.model.Topic.find(query, {}, opt).exec();

    if (topics.length === 0) {
      return [];
    }

    await Promise.all(
      topics.map(
        async topic => {
          const [ author, reply ] = await Promise.all([
            this.service.user.getUserById(topic.author_id),
            // 获取主题的最后回复
            this.service.reply.getReplyById(topic.last_reply),
          ]);
          topic.author = author;
          topic.reply = reply;
        }
      )
    );

    return topics.filter(topic => !!topic.author);
  }


  /*
   * 获取关键词能搜索到的主题数量
   * @param {String} query 搜索关键词
   */
  getCountByQuery(query) {
    return this.ctx.model.Topic.count(query).exec();
  }
}

module.exports = TopicService;