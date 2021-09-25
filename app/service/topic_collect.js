const Service = require('egg').Service;

class TopicCollectService extends Service {
  getTopicCollect(userId, topicId) {
    const query = { user_id: userId, topic_id: topicId };
    return this.ctx.model.TopicCollect.findOne(query).exec();
  }
}

module.exports = TopicCollectService;
