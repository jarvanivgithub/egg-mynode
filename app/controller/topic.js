const Controller = require('egg').Controller;
const _ = require('lodash');

class TopicController extends Controller {
  /**
   * 主题首页
   */
  async index() {
    function isUped(user, reply) {
      if (!reply.ups) return false;
      return reply.ups.indexOf(user._id) !== -1;
    }

    const { ctx, service } = this;
    const topic_id = ctx.params.tid;
    const currentUser = ctx.user;

    if (topic_id.length !== 24) {
      ctx.status = 404;
      ctx.message = '此话题不存在或已删除！';
      return;
    }

    const [ topic, author, replies ] = await service.topic.getFullTopic(topic_id);

    if (!topic) {
      ctx.status = 404;
      ctx.message = '此话题不存在或已删除！';
      return;
    }

    topic.visit_count += 1;
    await service.topic.incrementVisitCount(topic_id);

    topic.author = author;
    topic.replies = replies;
    // 点赞数排名第三的回答，它的点赞数就是阈值
    topic.reply_up_threshold = (() => {
      let allUpCount = replies.map(reply => {
        return (reply.ups && reply.ups.length) || 0;
      });
      allUpCount = _.sortBy(allUpCount, Number).reverse();

      let threshold = allUpCount[2] || 0;
      if (threshold < 3) {
        threshold = 3;
      }
      return threshold;
    })();

    const options = { limit: 5, sort: '-last_reply_at' };
    const query = { author_id: topic.author_id, _id: { $nin: [ topic._id ] } };
    const other_topics = await service.topic.getTopicsByQuery(query, options);

    let no_reply_topics = await service.cache.get('no_reply_topics');
    if (!no_reply_topics) {
      const query = { reply_count: 0, tab: { $nin: [ 'job', 'dev' ] } };
      const options = { limit: 5, sort: '-create_at' };
      no_reply_topics = await service.topic.getTopicsByQuery(query, options);
      await service.cache.setex('no_reply_topics', no_reply_topics, 60 * 1);
    }

    let is_collect;
    if (!currentUser) {
      is_collect = null;
    } else {
      is_collect = await service.topicCollect.getTopicCollect(
        currentUser._id,
        topic_id
      );
    }

    await ctx.render('topic/index', {
      topic,
      author_other_topics: other_topics,
      no_reply_topics,
      is_uped: isUped,
      is_collect,
    }, {
      layout: 'layout.html',
    });
  }

  /**
   * 进入主题创建页面
   */
  async create() {
    const { ctx, config } = this;
    await ctx.render('topic/edit', {
      tabs: config.tabs,
    }, {
      layout: 'layout.html',
    });
  }

  /**
   * 创建主题保存提交表单
   */
  async put() {
    const { ctx, service } = this;
    const { tabs } = this.config;
    const { body } = ctx.request;

    const allTabs = tabs.map(item => item[0]);

    const RULE_CREATE = {
      title: {
        type: 'string',
        max: 100,
        min: 5,
      },
      content: {
        type: 'string',
      },
      tab: {
        type: 'enum',
        values: allTabs,
      },
    };
    ctx.validate(RULE_CREATE, ctx.request.body);

    const topic = await service.topic.newAndSave(
      body.title,
      body.content,
      body.tab,
      ctx.user._id
    );

    // 发帖用户增加积分且增加发表主题数量
    await service.user.incrementScoreAndReplyCount(topic.author_id, 5, 1);

    ctx.redirect('/topic/' + topic._id);
  }
}

module.exports = TopicController;
