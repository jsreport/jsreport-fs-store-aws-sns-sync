const sync = require('./syncAWS')

module.exports = (reporter, definition) => {
  if (reporter.fsStore) {
    reporter.fsStore.registerSync('aws-sns',
      () => (sync({
        ...definition.options,
        logger: reporter.logger,
        serialize: reporter.fsStore.serialize,
        parse: reporter.fsStore.parsae
      })))
  }
}
