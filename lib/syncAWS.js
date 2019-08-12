/* eslint no-path-concat: 0 */
const Promise = require('bluebird')
const SNS = require('aws-sdk/clients/sns')
const SQS = require('aws-sdk/clients/sqs')
const crypto = require('crypto')
const hostname = require('os').hostname()
const { serialize, parse } = require('jsreport-fs-store/lib/customUtils')
const subscriptionName = 'jsreport-' + crypto.createHash('sha1').update(hostname + __dirname).digest('hex')

module.exports = ({ topic = 'jsreport', accessKeyId, secretAccessKey, subscription = subscriptionName, region = 'us-east-1', logger }) => {
  let sns
  let sqs
  if (accessKeyId != null && secretAccessKey != null) {
      sns = new SNS({ accessKeyId, secretAccessKey, region })
      sqs = new SQS({ accessKeyId, secretAccessKey, region })
  } else {
      sns = new SNS({ region })
      sqs = new SQS({ region })
  }
  Promise.promisifyAll(sns)
  Promise.promisifyAll(sqs)
  let topicArn
  let queueArn
  let queueUrl

  return {
    async init () {
      // https://matoski.com/article/snssqs-for-node-js/
      logger.info('fs store is initializing aws sns based synchronization')

      logger.info(`fs store is ensuring sns topic ${topic} exists`)
      const topicRes = await sns.createTopicAsync({ Name: topic })
      topicArn = topicRes.TopicArn

      logger.info(`fs store is ensuring sqs queue ${subscription} exists`)
      const queueRes = await sqs.createQueueAsync({ QueueName: subscription })
      queueUrl = queueRes.QueueUrl

      logger.info(`fs store is requesting queue arn`)
      const queueAttributesRes = await sqs.getQueueAttributesAsync({ QueueUrl: queueUrl, AttributeNames: ['QueueArn'] })
      queueArn = queueAttributesRes.Attributes.QueueArn

      logger.info(`fs store is subscribing queue to sns`)
      await sns.subscribeAsync({
        TopicArn: topicArn,
        Protocol: 'sqs',
        Endpoint: queueArn
      })

      const attributes = {
        'Version': '2008-10-17',
        'Id': queueArn + '/SQSDefaultPolicy',
        'Statement': [{
          'Sid': 'Sid' + new Date().getTime(),
          'Effect': 'Allow',
          'Principal': {
            'AWS': '*'
          },
          'Action': 'SQS:SendMessage',
          'Resource': queueArn,
          'Condition': {
            'ArnEquals': {
              'aws:SourceArn': topicArn
            }
          }
        }
        ]
      }

      logger.info(`fs store is granting publish permissions to the topic`)
      await sqs.setQueueAttributesAsync({
        QueueUrl: queueUrl,
        Attributes: {
          'Policy': JSON.stringify(attributes)
        }
      })

      this._initTime = new Date()
      this._listen().catch(logger.error.bind(logger))
    },

    async _listen () {
      try {
        const response = await sqs.receiveMessageAsync({ QueueUrl: queueUrl, WaitTimeSeconds: 10 })

        // no messages to process
        if (!response.Messages) {
          return this._listen()
        }

        const messageWrap = response.Messages[0]
        const message = parse(JSON.parse(messageWrap.Body).Message)

        if (message.meta.subscription === subscription) {
          logger.debug(`fs store received sync message came from the same source, skipping its processing`)
          await sqs.deleteMessageAsync({ QueueUrl: queueUrl, ReceiptHandle: messageWrap.ReceiptHandle })
          return this._listen()
        }

        if (new Date(JSON.parse(messageWrap.Body).Timestamp) < this._initTime) {
          logger.debug(`fs store received sync message is out of date, skipping its processing`)
          await sqs.deleteMessageAsync({ QueueUrl: queueUrl, ReceiptHandle: messageWrap.ReceiptHandle })
          return this._listen()
        }

        logger.debug(`fs store processing sync message for action ${message.action}`)
        this.subscription(message)
        await sqs.deleteMessageAsync({ QueueUrl: queueUrl, ReceiptHandle: messageWrap.ReceiptHandle })
        this._listen()
      } catch (e) {
        logger.error(`fs store processing sync failed ` + e)
        this._listen()
      }
    },

    subscribe (subscription) {
      this.subscription = subscription
    },

    async publish (message) {
      logger.debug(`fs store is publishing sync message ${message.action}`)
      const messageClone = Object.assign({}, message)
      messageClone.meta = {
        subscription
      }
      return sns.publishAsync({ TopicArn: topicArn, Message: serialize(messageClone) })
    },

    stop () {
    }
  }
}
