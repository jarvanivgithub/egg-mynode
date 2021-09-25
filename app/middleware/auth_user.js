module.exports = () => {
  return async function(ctx, next) {
    ctx.locals.current_user = null;
    const { user } = ctx;

    if (!user) {
      return await next();
    }

    const userInfo = await ctx.service.user.getUsersByQuery({
      name: user.username,
    });
    if (userInfo && userInfo.length) {
      user.loginname = userInfo[0].loginname;
      user.score = userInfo[0].score;
      user.avatar_url = userInfo[0].avatar;
      user._id = userInfo[0]._id;
    }

    const count = await ctx.service.message.getMessagesCount(user._id);
    user.messages_count = count;
    ctx.locals.current_user = user;
    await next();
  };
};
