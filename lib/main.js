const sync = require('./syncAWS')

module.exports = (reporter, definition) => {
  const options = { ...definition.options }
  // avoid exposing connection string through /api/extensions
  definition.options = {}

  if (reporter.fsStore) {
    reporter.fsStore.registerSync('aws-sns',
      () => (sync(Object.assign({}, options, { logger: reporter.logger }))))
  }
}
