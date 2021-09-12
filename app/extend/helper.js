exports.staticFile = function(filePath) {
  if (filePath.indexOf('http') === 0 || filePath.indexOf('//') === 0) {
    return filePath;
  }
  return this.app.config.site_static_host + filePath;
};

exports.tabName = function(tab) {
  const pair = this.app.config.tabs.find(pair => {
    return pair[0] === tab;
  });
  if (pair) {
    return pair[1];
  }
};
