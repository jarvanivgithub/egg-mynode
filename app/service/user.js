const Service = require('egg').Service;
const utility = require('utility');
const uuid = require('uuid');

class UserService extends Service {
  /*
   * 根据用户名列表查找用户列表
   * @param {Array} names 用户名列表
   * @return {Promise[users]} 承载用户列表的 Promise 对象
   */
  async getUsersByNames(names) {
    if (names.length === 0) {
      return [];
    }

    const query = { loginname: { $in: names } };
    return this.ctx.model.User.find(query).exec();
  }

  /**
   * 根据用户名查找用户
   * @param {String} loginName 登录用户名
   * @return {Promise[user]} 承载用户的 Promise 对象
   */
  getUserByLoginName(loginName) {
    const query = { loginname: new RegExp(`^${loginName}$`, 'i') };
    return this.ctx.model.User.findOne(query).exec();
  }

  /*
   * 根据用户ID，查找用户
   * @param {String} id 用户ID
   * @return {Promise[user]} 承载用户的 Promise 对象
   */
  async getUserById(id) {
    if (!id) return null;
    return this.ctx.model.User.findOne({ _id: id }).exec();
  }

  /*
   * 根据关键字，获取一组用户
   * Callback:
   * - err, 数据库异常
   * - users, 用户列表
   * @param {String} query 关键字
   * @param {Object} opt 选项
   * @return {Promise[users]} 承载用户列表的 Promise 对象
   */
  getUsersByQuery(query, opt) {
    return this.ctx.model.User.find(query, '', opt).exec();
  }

  newAndSave(loginname, pass, email, avatar_url, active) {
    const user = new this.ctx.model.User();
    user.name = loginname;
    user.loginname = loginname;
    user.pass = pass;
    user.email = email;
    user.avatar = avatar_url;
    user.active = active || false;
    user.accessToken = uuid.v4();

    return user.save();
  }

  makeGravatar(email) {
    return (
      'http://www.gravatar.com/avatar/' +
      utility.md5(email.toLowerCase()) +
      '?size=48'
    );
  }

  /**
   * 发表主题增加积分和发表数量
   * @param {*} id 用户id
   * @param {Number} score 新增积分
   * @param {Number} replyCount 新增发表数量
   * @return {Promise[user]} user保存结果
   */
  incrementScoreAndReplyCount(id, score, replyCount) {
    const query = { _id: id };
    const update = { $inc: { score, reply_count: replyCount } };
    return this.ctx.model.User.findByIdAndUpdate(query, update).exec();
  }
}

module.exports = UserService;
