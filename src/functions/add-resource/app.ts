import AWS from 'aws-sdk'
import { APIGatewayEvent } from 'aws-lambda'

const DynamoDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION })

const s3 = new AWS.S3()

export const lambdaHandler = async (event: APIGatewayEvent) => {
    const userKey = await getUserKey(event.requestContext.connectionId!)

    const userData = { 'hello': 'hi', 'bye': 'k' }
    await uploadUserData(userData, 2)

    try {

    } catch (error) {
        return { statusCode: 500, body: error.message }
    }

    return { statusCode: 200, body: 'Added' }
}

const getUserKey = async (connectionId: string) => {
    const queryParams: AWS.DynamoDB.DocumentClient.QueryInput = {
        TableName: process.env.TABLE_NAME!,
        KeyConditionExpression: 'PK = :PK',
        ExpressionAttributeValues: {
            ':PK': `CONNECTION#${connectionId}`
        },
        ProjectionExpression: 'SK'
    }
    const { Items } = await DynamoDB.query(queryParams).promise()
    if (Items) return Items[0].SK
}

const uploadUserData = async (userData: Object, userId: number) => {
    //var uploadParams = {Bucket: process.argv[2], Key: '', Body: ''};

    // uploadParams.Body = fileStream;
    // var path = require('path');
    // uploadParams.Key = path.basename(file);

    // // call S3 to retrieve upload file to specified bucket
    // s3.upload (uploadParams, function (err, data) {
    // if (err) {
    //     console.log("Error", err);
    // } if (data) {
    //     console.log("Upload Success", data.Location);
    // }
    // });
    
    const destparams = {
        Bucket: 'amzhawkfiles',
        Key: 'json/dummyUser1.json',    //This the path for the file
        Body: JSON.stringify(userData),
        ContentType: "application/json; charset=utf-8"
    };

    const putResult = await s3.putObject(destparams).promise(); 
}