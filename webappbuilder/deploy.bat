rem  folder options


C:
cd /
del deploy /F /Q
mkdir deploy
xcopy "C:\WebAppBuilderForArcGIS 2.11 NAPSG\server\apps\4" c:\deploy /e /y
aws s3 rm s3://sitaware-webapp --recursive
aws s3 sync c:/deploy s3://sitaware-webapp --delete --grants read=uri=http://acs.amazonaws.com/groups/global/AllUsers
explorer https://d302inpb3y6w1k.cloudfront.net/