const Service = require('egg').Service;

class TopicService extends Service {
  /*
   * 根据主题ID获取主题
   * @param {String} id 主题ID
   */
  async getTopicById(id) {
    const topic = await this.ctx.model.Topic.findOne({ _id: id }).exec();
    if (!topic) {
      return {
        topic: null,
        author: null,
        last_reply: null,
      };
    }

    const author = await this.service.user.getUserById(topic.author_id);

    let last_reply = null;
    if (topic.last_reply) {
      last_reply = await this.service.reply.getReplyById(topic.last_reply);
    }

    return {
      topic,
      author,
      last_reply,
    };
  }

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

  /**
   *
   * @param {String} title 主题标题
   * @param {String} content 主题内容
   * @param {String} tab 主题所属类型
   * @param {*} authorId 作者id
   * @return {Promise[topic]} topic保存结果
   */
  newAndSave(title, content, tab, authorId) {
    const topic = new this.ctx.model.Topic();
    topic.title = title;
    topic.content = content;
    topic.tab = tab;
    topic.author_id = authorId;

    return topic.save();
  }

  /*
   * 获取所有信息的主题
   * Callback:
   * - err, 数据库异常
   * - message, 消息
   * - topic, 主题
   * - author, 主题作者
   * - replies, 主题的回复
   * @param {String} id 主题ID
   * @param {Function} callback 回调函数
   */
  async getFullTopic(id) {
    const query = { _id: id, deleted: false };
    const topic = await this.ctx.model.Topic.findOne(query);

    if (!topic) return [];

    topic.linkedContent = this.service.at.linkUsers(topic.content);

    const author = await this.ctx.service.user.getUserById(topic.author_id);
    if (!author) return [];

    const replies = await this.ctx.service.reply.getRepliesByTopicId(topic._id);
    return [ topic, author, replies ];
  }

  incrementVisitCount(id) {
    const query = { _id: id };
    const update = { $inc: { visit_count: 1 } };
    return this.ctx.model.Topic.findByIdAndUpdate(query, update).exec();
  }

  /*
   * 更新主题的最后回复信息
   * @param {String} topicId 主题ID
   * @param {String} replyId 回复ID
   * @param {Function} callback 回调函数
   */
  updateLastReply(topicId, replyId) {
    const update = {
      last_reply: replyId,
      last_reply_at: new Date(),
      $inc: {
        reply_count: 1,
      },
    };
    const opts = { new: true };
    return this.ctx.model.Topic.findByIdAndUpdate(topicId, update, opts).exec();
  }

  /**
   * 增加该主题被保存数
   * @param {*} id 主题id
   * @return {Promise[Topic]} topic保存结果
   */
  incrementCollectCount(id) {
    const query = { _id: id };
    const update = { $inc: { collect_count: 1 } };
    return this.ctx.model.Topic.findByIdAndUpdate(query, update).exec();
  }

  /*
   * 根据主题ID，查找一条主题
   * @param {String} id 主题ID
   * @param {Function} callback 回调函数
   */
  getTopic(id) {
    return this.ctx.model.Topic.findOne({ _id: id }).exec();
  }

  /*
   * 将当前主题的回复计数减1，并且更新最后回复的用户，删除回复时用到
   * @param {String} id 主题ID
   */
  async reduceCount(id) {
    const update = { $inc: { reply_count: -1 } };
    const reply = await this.service.reply.getLastReplyByTopId(id);
    if (reply) {
      update.last_reply = reply._id;
    } else {
      update.last_reply = null;
    }
    const opts = { new: true };

    const topic = await this.ctx.model.Topic.findByIdAndUpdate(id, update, opts).exec();
    if (!topic) {
      throw new Error('该主题不存在');
    }

    return topic;
  }
}

module.exports = TopicService;
