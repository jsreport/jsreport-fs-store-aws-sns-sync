/* eslint no-path-concat: 0 */
const Promise = require('bluebird')
const SNS = require('aws-sdk/clients/sns')
const SQS = require('aws-sdk/clients/sqs')
const crypto = require('crypto')
const hostname = require('os').hostname()
const subscriptionName = crypto.createHash('sha1').update(hostname + __dirname).digest('hex')

module.exports = ({ topicName = 'jsreport', accessKeyId, secretAccessKey, instanceId = subscriptionName, region = 'eu-west-1', logger }) => {
  if (!accessKeyId) {
    throw new Error('The fs store is configured to use aws sns sync but the accessKeyId is not set. Use connectionString.sync.accessKeyId or fs-store-aws-sns-sync.accessKeyId to set the proper value.')
  }
  if (!secretAccessKey) {
    throw new Error('The fs store is configured to use aws sns sync but the accousecretAccessKeyntKey is not set. Use connectionString.sync.secretAccessKey or fs-store-aws-sns-sync.secretAccessKey to set the proper value.')
  }

  const sns = new SNS({ accessKeyId, secretAccessKey, region })
  const sqs = new SQS({ accessKeyId, secretAccessKey, region })
  Promise.promisifyAll(sns)
  Promise.promisifyAll(sqs)
  let topicArn
  let queueArn
  let queueUrl

  return {
    async init () {
      // https://matoski.com/article/snssqs-for-node-js/
      logger.debug('Initializing fs store aws sns based synchronization')

      logger.debug(`Ensuring sns topic ${topicName} exists`)
      const topicRes = await sns.createTopicAsync({ Name: topicName })
      topicArn = topicRes.TopicArn

      logger.debug(`Ensuring sqs queue ${subscriptionName} exists`)
      const queueRes = await sqs.createQueueAsync({ QueueName: subscriptionName })
      queueUrl = queueRes.QueueUrl

      logger.debug(`Requesting queue arn`)
      const queueAttributesRes = await sqs.getQueueAttributesAsync({ QueueUrl: queueUrl, AttributeNames: ['QueueArn'] })
      queueArn = queueAttributesRes.Attributes.QueueArn

      logger.debug(`Subscribing queue to sns`)
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

      logger.debug(`Granting publich permissions to the topic`)
      await sqs.setQueueAttributesAsync({
        QueueUrl: queueUrl,
        Attributes: {
          'Policy': JSON.stringify(attributes)
        }
      })

      await sqs.purgeQueueAsync({
        QueueUrl: queueUrl
      })

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
        const message = JSON.parse(JSON.parse(messageWrap.Body).Message)

        if (message.meta.subscriptionName === subscriptionName) {
          logger.debug(`Received sync message came from the same source, skipping its processing`)
          await sqs.deleteMessageAsync({ QueueUrl: queueUrl, ReceiptHandle: messageWrap.ReceiptHandle })
          return this._listen()
        }

        logger.debug(`Processing sync message for action ${message.action}`)
        this.subscription(message)
        await sqs.deleteMessageAsync({ QueueUrl: queueUrl, ReceiptHandle: messageWrap.ReceiptHandle })
        this._listen()
      } catch (e) {
        logger.error(`Processing sync failed ` + e)
        this._listen()
      }
    },

    subscribe (subscription) {
      this.subscription = subscription
    },

    async publish (message) {
      logger.debug(`Publishing sync message ${message.action}`)
      const messageClone = Object.assign({}, message)
      messageClone.meta = {
        subscriptionName
      }
      return sns.publishAsync({ TopicArn: topicArn, Message: JSON.stringify(messageClone) })
    },

    stop () {
    }
  }
}