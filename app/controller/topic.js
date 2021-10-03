const Controller = require('egg').Controller;
const _ = require('lodash');
const uuidv1 = require('uuid').v1;
const path = require('path');
const fs = require('fs');
const awaitWriteStream = require('await-stream-ready').write;
const sendToWormhole = require('stream-wormhole');

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

  /**
   * 显示编辑页面
   */
  async showEdit() {
    const { ctx, service, config } = this;
    const topic_id = ctx.params.tid;

    const { topic } = await service.topic.getTopicById(topic_id);

    if (!topic) {
      ctx.status = 404;
      ctx.message = 'topic is not found or has been deleted';
      return;
    }

    if (String(topic.author_id) === String(ctx.user._id) || ctx.user.is_admin) {
      await ctx.render('topic/edit', {
        action: 'edit',
        topic_id: topic._id,
        title: topic.title,
        content: topic.content,
        tab: topic.tab,
        tabs: config.tabs,
      }, {
        layout: 'layout.html',
      });
    } else {
      ctx.status = 401;
      ctx.message = 'sorry, you cannot edit topic';
    }
  }

  /**
   * 编辑主题
   */
  async update() {
    const { ctx, service, config } = this;

    const topic_id = ctx.params.tid;
    let { title, tab, content } = ctx.request.body;

    const { topic } = await service.topic.getTopicById(topic_id);
    if (!topic) {
      ctx.status = 404;
      ctx.message = '此话题不存在或已被删除。';
      return;
    }

    if (
      topic.author_id.toString() === ctx.user._id.toString() || ctx.user.is_admin
    ) {
      title = title.trim();
      tab = tab.trim();
      content = content.trim();

      // 验证
      let editError;
      if (title === '') {
        editError = '标题不能是空的。';
      } else if (title.length < 5 || title.length > 100) {
        editError = '标题字数太多或太少。';
      } else if (!tab) {
        editError = '必须选择一个版块。';
      } else if (content === '') {
        editError = '内容不可为空。';
      }
      // END 验证

      if (editError) {
        await ctx.render('topic/edit', {
          action: 'edit',
          edit_error: editError,
          topic_id: topic._id,
          content,
          tabs: config.tabs,
        }, {
          layout: 'layout.html',
        });
        return;
      }

      // 保存话题
      topic.title = title;
      topic.content = content;
      topic.tab = tab;
      topic.update_at = new Date();

      await topic.save();

      await service.at.sendMessageToMentionUsers(
        content,
        topic._id,
        ctx.user._id
      );

      ctx.redirect('/topic/' + topic._id);
    } else {
      ctx.status = 403;
      ctx.message = '对不起，你不能编辑此话题。';
    }
  }

  /**
   * 删除主题
   */
  async delete() {
    const { ctx, service } = this;
    const topic_id = ctx.params.tid;

    const [ topic, author ] = await service.topic.getFullTopic(topic_id);
    console.log(topic, author);

    if (!topic) {
      ctx.status = 422;
      ctx.body = { message: '此话题不存在或已删除！', success: false };
      return;
    }

    if (!ctx.user.is_admin && !topic.author_id.equals(ctx.user._id)) {
      ctx.status = 403;
      ctx.body = { message: '无权限', success: false };
      return;
    }

    author.score -= 5;
    author.topic_count -= 1;
    await author.save();

    topic.deleted = true;
    await topic.save();

    ctx.body = { message: '话题已被删除。', success: true };
  }

  /**
   * 收藏主题
   */
  async collect() {
    const { ctx, service } = this;
    const topic_id = ctx.request.body.topic_id;

    const topic = await service.topic.getTopicById(topic_id);
    const user_id = ctx.user._id;
    if (!topic) {
      ctx.body = { status: 'fail' };
      return;
    }

    const doc = await service.topicCollect.getTopicCollect(
      user_id,
      topic_id
    );

    if (doc) {
      ctx.body = { status: 'fail' };
      return;
    }

    await service.topicCollect.newAndSave(user_id, topic_id);
    ctx.body = { status: 'success' };

    await Promise.all([
      service.user.incrementCollectTopicCount(user_id),
      service.topic.incrementCollectCount(topic_id),
    ]);
  }

  /**
   * 取消收藏主题
   */
  async de_collect() {
    const { ctx, service } = this;
    const topic_id = ctx.request.body.topic_id;

    const topic = await service.topic.getTopic(topic_id);
    const user_id = ctx.user._id;

    if (!topic) {
      ctx.body = { status: 'fail' };
      return;
    }

    const removeResult = await service.topicCollect.remove(
      user_id,
      topic_id
    );

    if (removeResult.n === 0) {
      ctx.body = { status: 'fail' };
      return;
    }

    const user = await service.user.getUserById(user_id);

    user.collect_topic_count -= 1;
    await user.save();

    topic.collect_count -= 1;
    await topic.save();

    ctx.body = { status: 'success' };
  }

  /**
   * 照片上传
   */
  async upload() {
    const { ctx, config } = this;
    const uid = uuidv1();
    const stream = await ctx.getFileStream();
    const filename = uid + path.extname(stream.filename).toLowerCase();

    const target = path.join(config.upload.path, filename);
    const writeStream = fs.createWriteStream(target);
    try {
      await awaitWriteStream(stream.pipe(writeStream));
      ctx.body = {
        success: true,
        url: config.upload.url + filename,
      };
    } catch (error) {
      await sendToWormhole(stream);
      throw error;
    }

  }
}


module.exports = TopicController;
