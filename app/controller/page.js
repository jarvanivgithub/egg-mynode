const Controller = require('egg').Controller;

class PageController extends Controller {
  async getstart() {
    await this.ctx.render('static/getstart', { pageTitle: 'Node.js 新手入门' }, {
      layout: 'layout.html',
    });
  }

  async api() {
    await this.ctx.render('static/api', { pageTitle: 'API' }, {
      layout: 'layout.html',
    });
  }
  async about() {
    await this.ctx.render('static/about', { pageTitle: '关于我们' }, {
      layout: 'layout.html',
    });
  }
}

module.exports = PageController;
