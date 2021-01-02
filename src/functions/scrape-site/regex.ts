class Regex {
    getAmazonProductID(url: string) {
        let match = /(?<=\/dp\/)\w+/.exec(url);
        if (match) return match[0];
    }
}

export default new Regex();