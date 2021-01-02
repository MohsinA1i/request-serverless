import fetch from 'node-fetch'
import { URL } from 'url'
import HTTPProxyAgent from 'http-proxy-agent'
import SocksProxyAgent from 'socks-proxy-agent'

import regex from './regex'
import { stringValue } from 'aws-sdk/clients/iot'
import { link } from 'fs/promises'

export interface ScraperOptions {
    proxy?: string,
}

export interface Site {
    hostname: string,
    pages: { [key: string]: Page }, // Key is page URL
    links: { [key: string]: Link }, // Key is link URL
    products: { [key: string]: Product }, //Key is product URL
}

export interface Page {
    links: string[],
    status: 'scraped' | 'scraping' | 'error' | 'pending',
}

export interface Link {
    product?: string,
    pages: string[],
    status: 'scraped' | 'scraping' | 'error' | 'pending',
}

export interface Product {
    store: string,
    name?: string,
    image?: string,
    availability?: { code: number, text: string },
    status: 'scraped' | 'scraping' | 'error' | 'pending',
}

interface ResourceType {
    name: string,
    regex: RegExp
}

export default class Scraper {
    private proxyAgent

    constructor({ proxy }: ScraperOptions = {}) {
        this.proxyAgent = createProxyAgent(proxy)
    }

    async addSite(siteURL: string) {
        const hostname = new URL(siteURL).hostname
        const site = this.createSite(hostname)
        await this.addPage(hostname + '/', site);
        return site
    }

    createSite(hostname: string) {
        return { hostname: hostname, pages: {}, links: {}, products: {} }
    }

    async addPage(pageURL: string, site: Site, resourceTypes?: ResourceType[]) {
        const url = new URL(pageURL)
        const pageID = url.hostname + url.pathname
        const page = this.createPage(pageID, site)
        if (!resourceTypes) resourceTypes = this.getResourceTypes(url.hostname)
        await this.scrapePage(pageID, page, site, resourceTypes)
        return page
    }

    createPage(pageID: string, site: Site) {
        const page: Page = { links: [], status: 'pending' }
        site.pages[pageID] = page
        return page
    }

    async scrapePage(
        pageID: string,
        page: Page,
        site: Site,
        resourceTypes: { name: string, regex: RegExp }[],
    ) {
        const pageURL = `https://${pageID}`
        const response = await fetch(pageURL, { agent: this.proxyAgent })
        const html = await response.text()

        const baseMatch = html.match(/<base[^>]+href="([^"]+)/i)
        const baseURL = baseMatch ? baseMatch[1] : pageURL

        const resourceRegex = resourceTypes.map((resource) => new RegExp(resource.regex))
        const resources = html.matchAll(/(?:<a|<area)[^>]+href="([^?#"]+)/gi)

        const promises = []
        let resource = resources.next()
        while (resource.value) {
            const resourceURL = new URL(resource.value[1], baseURL)
            const matchIndex = resourceRegex.findIndex((regex) => regex.exec(resourceURL.toString()))
            if (matchIndex >= 0) {
                const resourceName = resourceTypes[matchIndex].name
                if (resourceName === 'site') {
                    const pageID = resourceURL.hostname + resourceURL.pathname
                    if (!site.pages[pageID]) {
                        const page = this.createPage(pageID, site)
                        promises.push(this.scrapePage(pageID, page, site, resourceTypes))
                    }
                } else {
                    const linkID = resourceURL.hostname + resourceURL.pathname + resourceURL.search
                    let link = site.links[linkID]
                    if (link) {
                        if (!page.links.includes(linkID)) {
                            page.links.push(linkID)
                            link.pages.push(pageID)
                        }
                    } else {
                        const link = this.createLink(linkID, pageID, site)
                        promises.push(this.scrapeLink(linkID, link, resourceName))
                    }
                }
            }
            resource = resources.next()
        }
        await Promise.allSettled(promises)
    }

    async addLink(linkURL: string, pageID: string, site: Site) {
        const url = new URL(linkURL)
        const linkID = url.hostname + url.pathname + url.search
        const link = this.createLink(linkID, pageID, site)
        //await this.scrapeLink(linkID, link, )
        return link
    }

    createLink(linkID: string, pageID: string, site: Site) {
        const link: Link = { pages: [], status: 'pending' }
        site.links[linkID] = link
        site.pages[pageID].links.push(linkID)
        link.pages.push(pageID)
        return link
    }

    async scrapeLink(linkID: string, link: Link, resourceName: string) {
        const linkURL = `https://${linkID}`
        if (resourceName === 'amazon') {
            const productURL = new URL(linkURL)
            link.product = `${productURL.hostname}/dp/${regex.getAmazonProductID(productURL.pathname)}`
        } else if (resourceName === 'amzn') {
            const { url } = await fetch(linkURL, {
                agent: this.proxyAgent
            })
            const productURL = new URL(url)
            link.product = `${productURL.hostname}/dp/${regex.getAmazonProductID(productURL.pathname)}`
        }
    }

    getResourceTypes(hostname: string): ResourceType[] {
        return [
            {
                name: 'site',
                regex: new RegExp(`https://${hostname}`)
            },
            {
                name: 'amazon',
                regex: /amazon./
            },
            {
                name: 'amzn',
                regex: /amzn.to/
            }
        ]
    }
}

const createProxyAgent = (proxyURL?: string) => {
    if (!proxyURL) return
    const protocol = new URL(proxyURL).protocol.slice(0, -1)
    if (protocol === 'http' || protocol === 'https')
        return new (HTTPProxyAgent as any)(proxyURL)
    else if (protocol === 'socks' || protocol === 'socks4a' || protocol === 'socks5a')
        return new (SocksProxyAgent as any)(proxyURL)
}