const Controller = require('egg').Controller;

class PageController extends Controller {
  async getstart() {
    await this.ctx.render('static/getstart', { pageTitle: 'Node.js 新手入门' }, {
      layout: 'layout.html',
    });
  }
}

module.exports = PageController;
