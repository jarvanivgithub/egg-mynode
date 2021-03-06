const Service = require('egg').Service;

class TopicCollectService extends Service {
  getTopicCollect(userId, topicId) {
    const query = { user_id: userId, topic_id: topicId };
    return this.ctx.model.TopicCollect.findOne(query).exec();
  }

  newAndSave(userId, topicId) {
    const topic_collect = new this.ctx.model.TopicCollect();
    topic_collect.user_id = userId;
    topic_collect.topic_id = topicId;
    return topic_collect.save();
  }

  remove(userId, topicId) {
    const query = { user_id: userId, topic_id: topicId };
    return this.ctx.model.TopicCollect.remove(query).exec();
  }
}

module.exports = TopicCollectService;
