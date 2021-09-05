'use strict';

const Controller = require('egg').Controller;
class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    // ctx.body = 'hi, egg';
    await ctx.render('home', {
      data: 'hello world',
    }, {
      layout: 'layout.html',
    });
  }
}

module.exports = HomeController;
