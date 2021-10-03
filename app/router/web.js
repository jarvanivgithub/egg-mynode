module.exports = app => {
  const { router, controller, middleware, config } = app;

  const { site, sign, message, page, user, topic, reply } = controller;

  const userRequired = middleware.userRequired();
  const createTopicLimit = middleware.createTopicLimit(config.topic);
  const createUserLimit = middleware.createUserLimit(config.create_user_per_ip);

  router.get('/', site.index); // 首页

  if (config.allow_sign_up) {
    // 跳转到注册页面
    router.get('/signup', sign.showSignup);
    // 提交注册信息
    router.post('/signup', createUserLimit, sign.signup);
  } else {
    // 进行github验证
    router.redirect('/signup', '/passport/github');
  }

  const localStrategy = app.passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/signin',
  });

  router.get('/signin', sign.showLogin); // 进入登录页面
  router.post('/passport/local', localStrategy);
  router.all('/signout', sign.signout); // 登出

  // user controller
  router.get('/user/:name', user.index);
  router.get('/user/:name/topics', user.listTopics); // 用户发布的所有话题页
  router.get('/setting', userRequired, user.showSetting);
  router.post('/setting', userRequired, user.setting);

  // message controler
  router.get('/my/messages', userRequired, message.index); // 用户个人的所有消息页

  // topic controller
  router.get('/topic/create', userRequired, topic.create);
  router.get('/topic/:tid', topic.index);
  router.get('/topic/:tid/edit', userRequired, topic.showEdit); // 编辑某话题

  router.post('/topic/create', userRequired, createTopicLimit, topic.put);
  router.post('/topic/:tid/edit', userRequired, topic.update);
  router.post('/topic/collect', userRequired, topic.collect); // 关注某话题
  router.post('/topic/de_collect', userRequired, topic.de_collect); // 取消关注某话题
  router.post('/topic/:tid/delete', userRequired, topic.delete); // 删除某话题
  router.post('/upload', userRequired, topic.upload); // 照片上传

  // reply controller
  router.post('/:topic_id/reply', userRequired, reply.add);
  router.get('/reply/:reply_id/edit', userRequired, reply.showEdit);
  router.post('/reply/:reply_id/edit', userRequired, reply.update);
  router.post('/reply/:reply_id/delete', userRequired, reply.delete); // 删除某评论
  router.post('/reply/:reply_id/up', userRequired, reply.up); // 为评论点赞

  // static page
  router.get('/api', page.api);
  router.get('/about', page.about);
  router.get('/getstart', page.getstart);
};
