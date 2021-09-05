module.exports = () => {
  return async function(ctx, next) {
    ctx.locals.current_user = null;
    const { user } = ctx;

    if (!user) {
      return await next();
    }

    const count = await ctx.service.message.getMessagesCount(user._id);
    user.messages_count = count;
    ctx.locals.current_user = user;
    await next();
  };
};
