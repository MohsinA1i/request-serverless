export var ApiClient: {
    instance: {
        accessKey: string,
        secretKey: string,
        host: string,
        region: string,
    }
}

export class DefaultApi {
    getItems(request: GetItemsRequest): {
        ItemsResult: {
            Items: {
                ASIN: string,
                DetailPageURL: string,
                ItemInfo: {
                    Title: {
                        DisplayValue: string
                    }
                },
                Offers: {
                    Listings: {
                        Availability: {
                            Message: string
                        }
                    }[]
                },
                Images: {
                    Primary: {
                        Medium: {
                            URL: string
                        }
                    }
                }
            }[]
        },
        Errors: {
            Message: string,
        }[]
    }
};

export class GetItemsRequest {
    PartnerTag: string;
    PartnerType: string;
    ItemIds: string[];
    Resources: string[];
};