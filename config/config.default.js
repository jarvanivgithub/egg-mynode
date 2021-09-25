/* eslint valid-jsdoc: "off" */

'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  config.name = 'MyNode技术社区';

  config.description = 'MyNode：Node.js专业中文社区';

  config.site_logo = '/public/images/cnodejs_light.svg';

  config.site_icon = '/public/images/cnode_icon_32.png';

  // debug 为 true 时，用于本地调试
  config.debug = true;

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1630737738074_2360';

  config.site_static_host = process.env.EGG_SITE_STATIC_HOST || ''; // 静态文件存储域名

  config.mini_assets = process.env.EGG_MINI_ASSETS || false;

  // add your middleware config here
  config.middleware = [ 'locals', 'authUser' ];

  // 版块
  config.tabs = [[ 'share', '分享' ], [ 'ask', '问答' ], [ 'job', '招聘' ]];

  config.authUser = {
    enable: true,
    match: '/',
  };

  // 是否允许直接注册（否则只能走 github 的方式）
  config.allow_sign_up = true;

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  config.view = {
    defaultExtension: '.ejs',
    defaultViewEngine: 'ejs',
    mapping: {
      '.ejs': 'ejs',
      '.html': 'ejs',
    },
  };

  config.redis = {
    client: {
      port: 6379, // Redis port
      host: '127.0.0.1', // Redis host
      password: 'auth',
      db: 0,
    },
  };

  config.mongoose = {
    url: 'mongodb://127.0.0.1:27017/egg_mynode',
    options: {
      server: { poolSize: 20 },
      reconnectTries: 10,
      reconnectInterval: 500,
    },
  };

  config.passportLocal = {
    usernameField: 'name',
    passwordField: 'pass',
  };

  config.security = {
    csrf: {
      ignore: '/api/*/*',
    },
  };

  config.topic = {
    perDayPerUserLimitCount: 10,
  };

  config.list_topic_count = 20;

  // 每个 IP 每天可创建用户数
  config.create_user_per_ip = 1000;

  return {
    ...config,
    ...userConfig,
  };
};
