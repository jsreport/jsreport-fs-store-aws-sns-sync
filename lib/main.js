const sync = require('./syncAWS')

module.exports = (reporter, definition) => {
  if (reporter.fsStore) {
    reporter.fsStore.registerSync('aws-sns',
      (options) => (sync(Object.assign({}, definition.options, { logger: reporter.logger }))))
  }

  // avoid exposing connection string through /api/extensions
  definition.options = {}
}
