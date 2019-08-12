const sync = require('./syncAWS')

module.exports = (reporter, definition) => {
  if (reporter.fsStore) {
    reporter.fsStore.registerSync('aws-sns',
      () => (sync(Object.assign({}, definition.options, { logger: reporter.logger }))))
  }
}
