# jsreport-fs-store-aws-sns-sync
[![NPM Version](http://img.shields.io/npm/v/jsreport-fs-store-aws-sns-sync.svg?style=flat-square)](https://npmjs.com/package/jsreport-fs-store-aws-sns-sync)
[![Build Status](https://travis-ci.org/jsreport/jsreport-fs-store-aws-sns-sync.png?branch=master)](https://travis-ci.org/jsreport/jsreport-fs-store-aws-sns-sync)

**Run jsreport [fs store](https://github.com/jsreport/jsreport-fs-store) in cluster and synchronize using AWS SNS.**


## Installation

> npm install jsreport-fs-store    
> npm install jsreport-fs-store-aws-sns-sync

Create an IAM user with permissions to SNS and SQS and copy the access key and secret access key. Then alter the jsreport configuration:
```js
"store": { 
  "provider": "fs",
  "sync": {
    "name": "aws-sns",
    // the rest is optional
    "accessKeyId": "...",
    "secretAccessKey": "..."
    "topic": "jsreport",
    "subscription": "<host id>",
    "region": "us-east-1"
  }
},	
```

The topic and subscription is automatically created if not existing during the instance startup.