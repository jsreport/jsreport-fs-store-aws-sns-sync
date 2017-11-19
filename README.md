# jsreport-fs-store-aws-sns-sync
[![NPM Version](http://img.shields.io/npm/v/jsreport-fs-store-aws-sns-sync.svg?style=flat-square)](https://npmjs.com/package/jsreport-fs-store-aws-sns-sync)
[![Build Status](https://travis-ci.org/jsreport/jsreport-fs-store-aws-sns-sync.png?branch=master)](https://travis-ci.org/jsreport/jsreport-fs-store-aws-sns-sync)

**Run jsreport [fs store](https://github.com/jsreport/jsreport-fs-store) in cluster and synchronize using AWS SNS.**


## Installation

> npm install jsreport-fs-store:next    
> npm install jsreport-fs-store-aws-sns-sync

And alter jsreport configuration 
```js
"connectionString": { 
  "name": "fs2",
  "sync": {
    "name": "aws-sns",
    "accessKeyId": "...",
    "secretAccessKey": "..."
    // the rest is optional
    "topic": "jsreport",
    "subscrption": "<host id>",
    "region": "us-east-1"
  }
},	
```