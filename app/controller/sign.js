const Controller = require('egg').Controller;
const validator = require('validator');

class SignControll extends Controller {
  // 登录
  async showLogin() {
    await this.ctx.render('/sign/signin', { pageTitle: '登录' }, {
      layout: 'layout.html',
    });
  }

  async showSignup() {
    await this.ctx.render('sign/signup', { pageTitle: '注册' }, {
      layout: 'layout.html',
    });
  }

  // 注册
  async signup() {
    const { ctx, service, config } = this;
    const loginname = validator.trim(ctx.request.body.loginname || '').toLowerCase();
    const email = validator.trim(ctx.request.body.email || '').toLowerCase();
    const pass = validator.trim(ctx.request.body.pass || '');
    const rePass = validator.trim(ctx.request.body.re_pass || '');

    let msg = '';
    if ([ loginname, email, pass, rePass ].some(item => item === '')) {
      msg = '信息不完整。';
    } else if (loginname.length < 5) {
      msg = '用户名至少需要5个字符。';
    } else if (!ctx.helper.validateId(loginname)) {
      msg = '用户名不合法。';
    } else if (!validator.isEmail(email)) {
      msg = '邮箱不合法。';
    } else if (pass !== rePass) {
      msg = '两次密码输入不一致。';
    }

    if (msg) {
      ctx.status = 422;
      await ctx.render('sign/signup', {
        error: msg,
        loginname,
        email,
      }, {
        layout: 'layout.html',
      });
      return;
    }

    const users = await service.user.getUsersByQuery({ $or: [
      { loginname },
      { email },
    ] }, {});
    if (users.length) {
      ctx.status = 422;
      await ctx.render('sign/signup', {
        error: '用户名或邮箱已被使用。',
        loginname,
        email,
      }, {
        layout: 'layout.html',
      });
      return;
    }

    const passhash = ctx.helper.bhash(pass);

    const avatarUrl = service.user.makeGravatar(email);

    await service.user.newAndSave(loginname, passhash, email, avatarUrl, false);
    // 发送激活邮件
    // await service.mail.sendActiveMail(email, utility.md5(email + passhash + config.session_secret), loginname);
    await ctx.render('sign/signup', {
      success: '欢迎加入 ' + config.name + '！我们已给您的注册邮箱发送了一封邮件，请点击里面的链接来激活您的帐号。',
    }, {
      layout: 'layout.html',
    });
  }

}

module.exports = SignControll;
