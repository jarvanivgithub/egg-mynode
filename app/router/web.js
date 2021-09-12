module.exports = app => {
  const { router, controller } = app;

  const { site } = controller;

  router.get('/', site.index);
};
