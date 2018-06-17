'use strict';
const setup = require('./starter-kit/setup');
//const puppeteer = require('puppeteer');
const BUCKET = process.env.S3_BUCKET;
const AWS = require('aws-sdk');
const fs = require('fs');
const S3 = new AWS.S3({
  signatureVersion: 'v4',
});

const pdfBuffer = async (browser,sourceurl, callback) => {
  try {
    const page = await browser.newPage();
    page.on('requestfailed', (a) => {
        console.log('Failed:', a.url);
      }
    );
    page.setDefaultNavigationTimeout(process.env.TIMEOUT);
    await page.goto(sourceurl, { waitUntil: ['domcontentloaded', 'networkidle0'] });
    
    var pdfbuffer = await page.pdf({ format: 'A4' });
    
    await browser.close();
    
    return pdfbuffer;
  }
  catch (err) {
    callback(err, { statusCode: 500, body: '{ "message": "Error occured while generating PDF", "error": true }' });
  }
}

const compressGostScript = async(outputFile,inputFile) => {
  return new Promise((resolve,reject) =>{
    var exec = require('child_process').exec, child;
    child = exec(
      'gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dColorImageResolution=144 -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -sOutputFile=' + inputFile + ' ' + outputFile,
      function (error, stdout, stderr) {
        if (error !== null) {
          console.log('exec error: ' + error);
          reject(error);
        }
        resolve(destFile);
      });
  });
}
const compressPdf = async (buffer, callback) => {
  try {
    const random = Math.random();
    const inputFile = `/tmp/source${random}.pdf`;
    const outputFile = `/tmp/destination${random}.pdf`;   
    //writes as file
    fs.writeFileSync(inputFile,buffer);
    var filename = await compressGostScript(inputFile,outputFile);
    buffer = fs.readFileSync(outputFile);
    return buffer;
  }
  catch (err) {
    callback(err, { statusCode: 500, body: '{ "message": "Error occured while compressing PDF", "error": true }' });
  }
}

const uploadToS3 = async (buffer, key, callback) => {
  try {
    if (!buffer) {
      callback(null, { statusCode: 500, body: '{ "message": "No PDF buffer available.", "error": true }' })
      return;
    }
    var object = await S3.putObject({
      Body: buffer,
      Bucket: BUCKET,
      Key: key,
    }).promise();
    return object;
  }
  catch (err) {
    callback(err, { statusCode: 500, body: '{ "message": "Error occured while uploading PDF", "error": true }' })
  }
}

const sendNotification = async (arn, key, callback) => {
  try {
    var sns = new AWS.SNS();
    return sns.publish({
      Message: `{"key":"${key}"}`,
      TopicArn: arn
    }).promise()
  }
  catch (err) {
    callback(err, { statusCode: 500, body: '{ "message": "Error occured while sending notification", "error": true }' })
  }
}

exports.handler = async (event, context, callback) => {
  var params = JSON.parse(event.body);
  const sourceurl = params.sourceurl;
  const pdflocation = params.pdflocation;
  const compress = params.compress;
  const arn = params.arn;
  context.callbackWaitsForEmptyEventLoop = false;
  const browser = await setup.getBrowser();
  try {
      var buffer = await pdfBuffer(browser,sourceurl, callback);
      if (compress)
        buffer = await compressPdf(buffer,callback);
      await uploadToS3(buffer, pdflocation, callback);
      if (arn){
        await sendNotification(arn,pdflocation);
      }
      callback(null, { body: JSON.stringify({"result":"PDF generated."}) });
  }
  catch (err) {
    console.log("error occured")
    console.log(err);
    callback(err, { statusCode: 500, body: '{ "message":"Error occured while generating pdf.","error":true }' })
  }
  return "done";
}