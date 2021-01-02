import AWS from 'aws-sdk'
import { APIGatewayEvent } from 'aws-lambda'

import Scraper from './scraper'

const DynamoDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION })

export const lambdaHandler = async (event: APIGatewayEvent) => {
    try {
        
    } catch (error) {
        return { statusCode: 500, body: error.message }
    }

    return { statusCode: 200, body: 'Scraped' }
}