// Webpack loader for data/portfolio.json: drops the private `_todo` notes and
// hidden experience entries before the data reaches any JS bundle. Node
// scripts (check-copy, check-ssr, sitemap) read the full file directly.
module.exports = function stripPrivate(source) {
  const data = JSON.parse(source);
  delete data._todo;
  if (Array.isArray(data.experience)) data.experience = data.experience.filter((job) => !job.hidden);
  return JSON.stringify(data);
};
