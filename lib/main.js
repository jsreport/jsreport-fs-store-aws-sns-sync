const sync = require('./syncAWS')

module.exports = (reporter, definition) => {
  if (reporter.fsStore) {
    reporter.fsStore.registerSync('aws-sns',
      (options) => (sync(Object.assign({ logger: reporter.logger }, options, definition.options))))
  }
}