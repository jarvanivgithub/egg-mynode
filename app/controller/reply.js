const Controller = require('egg').Controller;

class ReplyController extends Controller {
  /**
   * 添加回复
   */
  async add() {
    const { ctx, service } = this;
    const { r_content: content, reply_id } = ctx.request.body;

    if (content.trim() === '') {
      ctx.status = 422;
      ctx.body = {
        error: '回复内容不能为空!',
      };
      return;
    }

    const topic_id = ctx.params.topic_id;
    let topic = await service.topic.getTopicById(topic_id);
    topic = topic.topic;

    if (!topic) {
      ctx.status = 404;
      ctx.message = '这个主题不存在！';
      return;
    }
    if (topic.lock) {
      ctx.status = 403;
      ctx.body = {
        error: '该主题已锁定',
      };
      return;
    }

    const user_id = ctx.user._id;
    const topicAuthor = await service.user.getUserById(topic.author_id);
    const newContent = content.replace(`@${topicAuthor.loginname} `, '');
    const reply = await service.reply.newAndSave(content, topic_id, user_id, reply_id);

    await Promise.all([
      service.user.incrementScoreAndReplyCount(user_id, 5, 1),
      service.topic.updateLastReply(topic_id, reply._id),
    ]);

    await service.at.sendMessageToMentionUsers(newContent, topic_id, user_id, reply._id);
    if (topic.author_id.toString() !== user_id.toString()) {
      await service.message.sendReplyMessage(topic.author_id, user_id, topic._id, reply._id);
    }

    ctx.redirect(`/topic/${topic_id}#${reply._id}`);
  }
}

module.exports = ReplyController;
