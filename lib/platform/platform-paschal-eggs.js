const { loadPlatformAuthor } = require("./platform-author");
const { loadPlatformUiEggs } = require("./platform-ui-eggs");

/** Один ответ: автор, статистика проекта и UI-пасхалки (_content_/easter-eggs/). */
function loadPlatformPaschalEggs(projectRoot = process.cwd()) {
  const root = projectRoot;
  const { author, project, stats } = loadPlatformAuthor(root);
  const uiEggs = loadPlatformUiEggs(root);
  return {
    author,
    project,
    stats,
    eggs: {
      source: uiEggs.source,
      files: uiEggs.files,
      slogans: uiEggs.slogans,
      homeTitles: uiEggs.homeTitles
    }
  };
}

module.exports = {
  loadPlatformPaschalEggs
};
