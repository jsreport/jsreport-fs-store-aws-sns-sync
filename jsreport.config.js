
module.exports = {
  'name': 'fs-store-aws-sns-sync',
  'main': 'lib/main.js',
  'dependencies': ['templates', 'fs-store'],
  'optionsSchema': {
    extensions: {
      'fs-store': {
        type: 'object',
        properties: {
          sync: {
            type: 'object',
            properties: {
              provider: { type: 'string', enum: ['aws-sns'] }
            }
          }
        }
      },
      'fs-store-aws-sns-sync': {
        type: 'object',
        properties: {
          accessKeyId: { type: 'string' },
          secretAccessKey: { type: 'string' },
          topic: { type: 'string' },
          subscription: { type: 'string' },
          region: { type: 'string' }
        }
      }
    }
  }
}
