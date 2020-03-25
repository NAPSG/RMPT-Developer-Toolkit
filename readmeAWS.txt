


#This was 7/6, learning how to deploy to S3
#Better method is to deploy to cloudfront

https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html

aws s3 ls
aws s3 ls s3://sitaware.coloredeggs.com
aws s3 rm s3://sitaware.coloredeggs.com --recursive
aws s3 cp /Users/charlesletcher/Documents/GitHub/ThemedSituationalAwareness/src/SituationAwareness s3://sitaware.coloredeggs.com --grants read=uri=http://acs.amazonaws.com/groups/global/AllUsers --recursive
aws s3 rm s3://sitaware.coloredeggs.com/SituationAwareness --recursive

http://sitaware.coloredeggs.com.s3-website-us-east-1.amazonaws.com

curl -I -X GET -H "Origin: http://example.com" --verbose http://aaaabbbbccccdd.cloudfront.net/some/cached/file.png


update for no caching

aws cloudfront list-distributions
aws cloudfront get-distribution-config --id E15QY1QAYURU1Z