# Pdf generator using puppeteer for lambda
This project made specifically for lambda and deploying using SAM. Does following tasks.

1. Generate pdf for given URL and store in S3.
2. Compress PDF using ghostscript if needed.
3. Send SNS notification at the end.

## Parameters to pass:
```json
{
"sourceurl": "[URL needs to print as PDF]",
"pdflocation": "[s3 key location]",
"compress":true,
"sns_arn": "[SNS arn to send notification]"
}
```
Parameters compress and sns_arn are optional and pass only if needed.

# Notes
* Change S3 bucket name in template.yaml before executing on `sam local`.
* Lambda has certain limitation in terms of timeout (allow maximum 5 minutes) and package size. Please read article [AWS Lambda limits](https://docs.aws.amazon.com/lambda/latest/dg/limits.html#limits-list) for detail. `npm install` will also download chromium for your development OS which may exceed size requirements for lambda. This package already include puppeteer build for amazon linux so you can remove build download while `npm install`. You may find it in `node_modules\puppeteer\.local-chromium` which can be simply remove.

# How To Run on local
[TODO]

# Credits
This project uses and take references from following projects and articles and greatly thankful for their hard work.
1. [puppeteer-lambda-starter-kit](https://github.com/sambaiz/puppeteer-lambda-starter-kit)
2. [Ghost Script](https://www.ghostscript.com/)
3. [lambda_s3pdf_compress](https://github.com/imhassan/lambda_s3pdf_compress/blob/master/index.js)
4. [serverless-chrome](https://github.com/adieuadieu/serverless-chrome)
