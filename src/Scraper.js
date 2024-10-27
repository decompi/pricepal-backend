const puppeteer = require('puppeteer-extra');
const Stealth = require('puppeteer-extra-plugin-stealth');
const randomUserAgent = require('random-useragent');
const fs = require('fs');
const { Cluster } = require('puppeteer-cluster');
const config = require('@config/config.json');

puppeteer.use(Stealth());

class Scraper {
    constructor(database) {
        this.database = database;
        this.cluster = null;
        this.sessionCookies = {}
    }

    async initCluster() {
        this.cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            maxConcurrency: config.clusterSettings.maxConcurrency,
            timeout: config.clusterSettings.timeout,
            puppeteerOptions: config.browserSettings
        });

        await this.registerTasks()
    }

    async registerTasks() {
        await this.cluster.task(async ({ page, data }) => {
            const { store } = data
            const storeConfig = config.stores[store]
    
            if (!storeConfig) {
                console.warn(`Store ${store} is not supported.`)
                return null
            }
            const taskName = storeConfig.taskName;
            
            if (typeof this[taskName] === 'function') {
                return await this[taskName]({ page, data })
            } else {
                console.warn(`Task function ${taskName} not found for store: ${store}`)
                return null;
            }
        });
    }

        // build a profile for each website to set the postal code
    async updateWalmartPostalCode(page, postalCode) {
        try {
            await this.setupPage(page, 'walmart', {
                blockRequest: true,
                blockDriver: true,
                //domainBlock: true,
                //domains: ['fonts.googleapis.com', ]
            });

            await page.goto(`https://www.walmart.com/store-finder?location=${postalCode}`, {
                waitUntil: 'domcontentloaded'
            })

            await new Promise(resolve => setTimeout(resolve, 300000))

            /*await Promise.all([
                await page.waitForSelector('[class="w_hhLG w_XK4d w_0_LY"]', {
                    timeout: 5000,
                    visible: true
                })
            ])
            //await page.click('[class="w_hhLG w_XK4d w_0_LY"]:first-child')
            await page.evaluate(() => {
                document.querySelectorAll('[class="w_hhLG w_XK4d w_0_LY"]')[0].click()
            });

            //await page.waitForTimeout(3000);
            await new Promise(resolve => setTimeout(resolve, 3000))

            const cookies = await page.cookies();

            const assortmentStoreIdCookie = cookies.find(cookie => cookie.name === 'assortmentStoreId')
            const assortmentStoreId = assortmentStoreIdCookie ? assortmentStoreIdCookie.value : null

            let zipCodeData = {
                cookies: cookies,
                storeId: assortmentStoreId
            }
            this.sessionCookies[postalCode] = zipCodeData

            return zipCodeData*/
        } catch(err) {
            console.warn(`Error setting postal code on Walmart: ${err.message}`)
            return []
        }
    }

    loadCookies(storeName) {
        const cookiesPath = config.stores[storeName].cookiePath;
        try {
            const cookiesData = fs.readFileSync(cookiesPath)
            return JSON.parse(cookiesData)
        } catch (err) {
            console.warn(`No cookies found for ${storeName}, starting fresh session.`);
            return []
        }
    }

    saveCookies(storeName, newCookies) {
        const cookiesPath = config.stores[storeName].cookiePath;
        fs.writeFileSync(cookiesPath, JSON.stringify(newCookies))
        console.log(`Cookies saved for ${storeName}`)
    }

    async setupPage(page, storeName, options = {}) {
        if(storeName == "target") {
            //await page.authenticate({ username: process.env.username, password:   process.env.password });
        }
        await page.setDefaultNavigationTimeout(0);

        if(!options.inUse) {
            await page.setUserAgent(randomUserAgent.getRandom());
            await page.setViewport({
                width: Math.floor(Math.random() * (1920 - 1366 + 1)) + 1366,
                height: Math.floor(Math.random() * (1080 - 768 + 1)) + 768
            });
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9'
            });
            await page.emulateTimezone('America/New_York');

            let cookies = this.loadCookies(storeName)
            if (cookies.length > 0) {
                await page.setCookie(...cookies)
            }
        }

        if (options.blockRequest === true || options.domainBlock) {
            await page.setRequestInterception(true)
            page.on('request', (req) => {
                const blockTypes = ['image', 'stylesheet', 'font', 'media', 'xhr', 'fetch'];
                const blockedDomains = ['i5.walmartimages.com', 'csp.walmart.com'];

                const requestUrl = req.url().toLowerCase();

                if (blockTypes.includes(req.resourceType()) || blockedDomains.some(domain => requestUrl.includes(domain))) {
                    req.abort()
                } else {
                    req.continue()
                }
                
            });
        }

        if (options.blockDriver === true) {
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false
                })
            })
        }

        return page
    }

    async getProductPrice(productId, store, postalCode) {
        const storeConfig = config.stores[store.toLowerCase()];
        if (!storeConfig) {
            throw new Error(`Store ${store} is not configured`);
        }
    
        return await this.cluster.execute({
            productId: productId,
            store: store.toLowerCase(),
            postalCode: postalCode
        });
    }

    async filterProductData(data, store) {
        //console.log(data, store)
        switch(store) {
            case 'walmart':
                if(data) {
                    const { offers, gtin13} = data;
                    const { price, availability } = offers || {}

                    let schemaData = {
                        price: price || null,
                        availability: availability ? availability.includes("InStock") : false,
                        gtin13: gtin13 || null,
                        productId: data._backend.productId,
                        lastUpdated: Date.now(),
                        storeId: data._backend.storeId || -1
                    }

                    let schema = this.database[config.stores[store].schema]

                    let newData = await schema.findOneAndUpdate(
                        { storeId: schemaData.storeId, productId: schema.productId},
                        { $set: schemaData},
                        { new: true, upsert: true}
                    ).lean()
                    return newData
                }
                break;
            case 'costco':
                if (data && Array.isArray(data) && data.length > 0) {
                    const product = data[0]
    
                    let schemaData = {
                        price: product.priceTotal || null,
                        productId: data._backend.productId || null,
                        lastUpdated: Date.now(),
                        storeId: config.stores[store].storeId || -1 
                    }
    
                    let schema = this.database[config.stores[store].schema]
    
                    let newData = await schema.findOneAndUpdate(
                        { storeId: schemaData.storeId, productId: schemaData.productId },
                        { $set: schemaData },
                        { new: true, upsert: true }
                    ).lean()
                    return newData
                }
                break

                case 'target':
                    if (data && data.price) {
                        const { price, tcin } = data.price;
                        let schemaData = {
                            price: price.current_retail || null,
                            productId: data._backend.productId || tcin || null,
                            lastUpdated: Date.now(),
                            storeId: data._backend.storeId || -1,
                            tcin: tcin || null
                        };
        
                        let schema = this.database[config.stores[store].schema];
        
                        let newData = await schema.findOneAndUpdate(
                            { storeId: schemaData.storeId, productId: schemaData.productId },
                            { $set: schemaData },
                            { new: true, upsert: true }
                        ).lean();
                        return newData
                    }
                    break
            default:
                return data
        }
    }

    async scrapeTargetData({ page, data}) {
        const { productId } = data

        try {
            await this.setupPage(page, "target", {
                blockRequest: true,
                blockDriver: true
            })

            await page.goto(`https://www.target.com/p/-/${productId}`, { waitUntil: 'domcontentloaded' })

            const productData = await page.evaluate(() => {
                return window.__TGT_DATA__?.__PRELOADED_QUERIES__?.queries[3]?.[1]?.data?.product || null;
            })
            let storeId = null
            /*const fiatsCookieValue = await page.evaluate(() => {
                const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
                    const [name, value] = cookie.split('=');
                    acc[name] = value;
                    return acc;
                }, {});
                return cookies['fiatsCookie'];
            });

            if(fiatsCookieValue) {
                const match = fiatsCookieValue.match(/DSI_(\d+)/)
                console.log(match)
                if(match && match[1]) {
                    storeId = match[1];
                }
            }*/

            if(productData) {
                productData._backend = {
                    productId: productId,
                    storeId: storeId
                }

                return productData
            } else {
                console.warn(`Product data not found for Target product: ${productId}`)
                return null
            }
        } catch(err) {
            console.warn(`Error scraping Target product ${productId}: `, err.message)
        }
    }
    
    async scrapeWalmartProduct({ page, data }) {
        const { productId, postalCode } = data
        try {

            let options = { blockRequest: true, blockDriver: true }

            /*if (postalCode && !sessionData) {
                sessionData = await this.updateWalmartPostalCode(page, postalCode)
                options.inUse = true
                this.sessionCookies[postalCode] = sessionData
            }

            if (sessionData?.cookies) {
                await page.setCookie(...sessionData.cookies)
            }*/
    

            await this.setupPage(page, 'walmart', options)
            await page.goto(`https://www.walmart.com/ip/${productId}`, { waitUntil: 'domcontentloaded' })

            const productData = await page.evaluate(() => {
                let obj = document.querySelector('script[type="application/ld+json"][data-seo-id="schema-org-product"]')
                return obj ? JSON.parse(obj.innerText) : null
            });

            const cookies = await page.cookies()
            const assortmentStoreIdCookie = cookies.find(cookie => cookie.name === 'assortmentStoreId')
            const assortmentStoreId = assortmentStoreIdCookie ? assortmentStoreIdCookie.value : null

            if (productData) {
                productData._backend = {
                    productId: productId,
                    storeId: assortmentStoreId || sessionData?.storeId || null
                };
            }

            if (postalCode) {
                this.saveCookies('walmart', cookies);
                this.sessionCookies[postalCode] = { cookies, storeId: assortmentStoreId };
            }

            return productData;
        } catch (err) {
            console.warn(`Error scraping Walmart product ${productId}:`, err.message)
            throw err
        }
    }

    async scrapeCostcoProduct({ page, data }) {
        const { productId } = data
        try {
            await this.setupPage(page, 'costco', { blockRequest: true, blockDriver: true })
            await page.goto(`https://www.costco.com/.product.${productId}.html`, { waitUntil: 'domcontentloaded' })

            const productData = await page.evaluate(() => {
                return adobeProductData || null
            })

            const preferredWarehouse = await page.evaluate(() => {
                const warehouseData = localStorage.getItem('preferredWarehouse')
                return warehouseData ? JSON.parse(warehouseData).warehouseId : null
            })

            if(productData) {
                productData._backend = {
                    productId: productId,
                    storeId: preferredWarehouse || -1
                }
            }
            this.saveCookies('costco', await page.cookies())
            return productData
        } catch (err) {
            console.warn(`Error scraping Costco product ${productId}:`, err.message)
            throw err
        }
    }

    async closeCluster() {
        await this.cluster.idle()
        await this.cluster.close()
    }
}

module.exports = Scraper;