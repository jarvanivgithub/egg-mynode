const Controller = require('egg').Controller;
const _ = require('lodash');
const utility = require('utility');
const validator = require('validator');

class UserController extends Controller {
  async index() {
    const { ctx, service, config } = this;
    const user_name = ctx.params.name;
    const user = await service.user.getUserByLoginName(user_name);
    if (!user) {
      ctx.status = 404;
      ctx.body = '该用户不存在！';
      return;
    }

    let query = { author_id: user._id };
    const [ recent_topics, replies ] = await Promise.all([
      service.topic.getTopicsByQuery(query, { limit: 5, sort: '-create_at' }),
      service.reply.getRepliesByAuthorId(user._id, { limit: 20, sort: '-create_at' }),
    ]);

    const topic_ids = [ ...new Set(replies.map(reply => reply.topic_id.toString())) ].slice(0, 5);

    query = { _id: { $in: topic_ids } };
    let recent_replies = await service.topic.getTopicsByQuery(query, {});

    // 得到的结果升序排序
    recent_replies = _.sortBy(recent_replies, topic => {
      return topic_ids.indexOf(topic._id.toString());
    });

    user.url = (() => {
      if (user.url && user.url.indexOf('http') !== 0) {
        return 'http://' + user.url;
      }
      return user.url;
    })();

    // 如果用户没有激活，那么管理员可以帮忙激活
    let token = '';
    if (!user.active && ctx.user && ctx.user.is_admin) {
      token = utility.md5(user.email + user.pass + config.session_secret);
    }

    await ctx.render('user/index', {
      user,
      recent_topics,
      recent_replies,
      token,
      pageTitle: `@${user.loginname} 的个人主页`,
    }, {
      layout: 'layout.html',
    });
  }

  async showSetting() {
    const { ctx, service } = this;
    const id = ctx.user._id;
    const user = await service.user.getUserById(id);

    if (ctx.request.query.save === 'success') {
      user.success = '保存成功！';
    }

    await ctx.render('user/setting', { user, pageTitle: '设置' }, {
      layout: 'layout.html',
    });
  }

  async setting() {
    const { ctx, service } = this;
    async function showMessage(msg, data, isSuccess) {
      data = data || ctx.request.body;
      const user = {
        loginname: data.loginname,
        email: data.email,
        url: data.url,
        location: data.location,
        signature: data.signature,
        weibo: data.weibo,
        accessToken: data.accessToken,
      };

      if (isSuccess) {
        user.success = msg;
      } else {
        user.error = msg;
      }

      await ctx.render('user/setting', { user }, {
        layout: 'layout.html',
      });
    }

    const { body } = ctx.request;
    const action = body.action;

    if (action === 'change_setting') {
      const url = validator.trim(body.url);
      const location = validator.trim(body.location);
      const weibo = validator.trim(body.weibo);
      const signature = validator.trim(body.signature);

      const user = await service.user.getUserById(ctx.user._id);
      user.url = url;
      user.location = location;
      user.weibo = weibo;
      user.signature = signature;
      await user.save();
      return ctx.redirect('/setting?save=success');
    }

    if (action === 'change_password') {
      const oldPass = validator.trim(body.old_pass);
      const newPass = validator.trim(body.new_pass);
      if (!oldPass || !newPass) {
        return showMessage('旧密码或新密码不得为空');
      }

      const user = await service.user.getUserById(ctx.user._id);
      const equal = ctx.helper.bcompare(oldPass, user.pass);
      if (!equal) {
        return showMessage('当前密码不正确。', user);
      }

      const newPassHash = ctx.helper.bhash(newPass);
      user.pass = newPassHash;
      await user.save();
      return showMessage('密码已被修改。', user, true);
    }
  }
}

module.exports = UserController;
