import AWS from 'aws-sdk';
import { APIGatewayEvent } from 'aws-lambda';

import ProductAdvertisingAPIv1 from './paapi';

const DynamoDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

export const lambdaHandler = async (event: APIGatewayEvent) => {
    try {

    } catch (error) {
        return { statusCode: 500, body: error.message };
    }

    return { statusCode: 200, body: 'Scraped' };
}

const scrapeProducts = async (options: { [key: string]: any }) => {
    const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
    defaultClient.accessKey = options.credentials.accessKey;
    defaultClient.secretKey = options.credentials.secretKey;
    defaultClient.host = `webservices.${getDomain(options.credentials.marketplace)}`;
    defaultClient.region = getAmazonRegion(defaultClient.host);

    const products: { [key: string]: any }[] = [];
    const requests = splitProuctIDs(options.productIDs);
    for (const productIDs of requests) {
        const getItemsRequest = new ProductAdvertisingAPIv1.GetItemsRequest();
        getItemsRequest.PartnerTag = options.credentials.partnerTag;
        getItemsRequest.PartnerType = options.credentials.partnerType || 'Associates';
        getItemsRequest.ItemIds = productIDs;
        getItemsRequest.Resources = ['ItemInfo.Title', 'Offers.Listings.Availability.Message', 'Images.Primary.Medium'];

        const api = new ProductAdvertisingAPIv1.DefaultApi();
        const response = await api.getItems(getItemsRequest);
        for (const item of response.ItemsResult.Items) {
            const product: { [key: string]: any } = {
                url: item.DetailPageURL,
                productID: item.ASIN,
                name: item.ItemInfo.Title.DisplayValue,
                image: item.Images.Primary.Medium.URL
            }
            let availability;
            if (item.Offers) availability = item.Offers.Listings[0].Availability.Message;
            else availability = 'Currently unavailable.';
            if (availability === 'Currently unavailable.')
                product.availability = { code: 0, text: 'Currently Unavailable', }
            else if (availability === 'In stock.')
                product.availability = { code: 1, text: 'In Stock' }
            else
                product.availability = { code: 2, text: availability }
            products.push(product);
        }
        if (response.Errors) {
            for (const error of response.Errors) {
                const match = /ItemId ([0-9A-Z]+)/.exec(error.Message);
                if (match) products.push({ productID: match[1], error: error.Message });
            }
        }
    }
}

const splitProuctIDs = (productIDs: string[]) => {
    const requests = [];
    let index = 0;
    while (index < productIDs.length) {
        requests.push(productIDs.slice(index, index + 10));
        index += 10;
    }
    return requests;
}

const getDomain = (url: string) => {
    const match = /(?:https?:\/\/)?(?:www\.)?([^/]+)/.exec(url);
    if (match) return match[1];
    return '';
}

const getAmazonRegion = (domain: string) => {
    if (domain.endsWith('.co.uk')) return 'eu-west-1';
    else return 'us-east-1';
}