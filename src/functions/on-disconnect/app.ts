import AWS from 'aws-sdk';
import { APIGatewayEvent } from 'aws-lambda';

const DynamoDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

export const lambdaHandler = async (event: APIGatewayEvent) => {
    try {
        const deleteParams: AWS.DynamoDB.DocumentClient.DeleteItemInput = {
            TableName: process.env.TABLE_NAME!,
            Key: {
                PK: `CONNECTION#${event.requestContext.connectionId}`
            }
        }
        await DynamoDB.delete(deleteParams).promise()
    } catch (error) {
        return { statusCode: 500, body: error.message }
    }
    return { statusCode: 200, body: 'Disconnected' };
}