const babelJest = require('babel-jest');

const babelTransformer = babelJest.createTransformer({
  configFile: './babel.config.cjs',
});

module.exports = {
  process(src, filename, config, options) {
    // Replace import.meta with a global variable to avoid syntax errors in Jest
    const patched = src.replace(/\bimport\.meta\b/g, 'importMeta');
    return babelTransformer.process(patched, filename, config, options);
  },
};
