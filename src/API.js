const express = require('express');
const axios = require('axios');
const helmet = require('helmet');
const bodyParser = require('body-parser')
const config = require("@config/config.json")
const cors = require('cors');
const authenticate = require('./middleware/auth')
const morgan = require('morgan')


class API {
    constructor(database, scraper) {
        this.express = express();
        this.database = database;
        this.scraper = scraper;

        //this.express.use(helmet());
        this.express.use(cors());
        this.express.use(bodyParser.json());
        this.express.use(authenticate);
        this.express.use(morgan('combined'));


        this.express.use((err, req, res, next) => {
            console.error(err.stack)

            res.status(err.status || 500).json({
                message: err.messag || "Internal Server Error",
                error: process.env.NODE_ENV === "development" ? err : {}
            })
        })

        this._defineRoutes();


        this.express.listen(process.env.API_PORT ?? 8196, '127.0.0.1', () => {
            console.log(`API Server is running: PORT - ${process.env.API_PORT ?? 8196}`);
        });
    }

    _defineRoutes() {
        //this.express.post('/api/items', this._addItem.bind(this));
        this.express.get('/api/v1/items', this._getAllItems.bind(this));
        this.express.get('/api/v1/items/:itemId', this._getItemById.bind(this))

        // STORE SPEICIFC PRICE ENDPOINTS
        this.express.get('/api/v1/items/:itemId/prices/:postalCode?', this._getPricesById.bind(this));

        this.express.get('/api/v1/stores/:itemId', this._getStoresByItemAndLocation.bind(this));

        // WAITLIST
        this.express.post('/api/v1/join-waitlist', this._joinWaitlist.bind(this));
    }

    // ADMIN
    async _addItem() {
        try {
            const item = await this.database.addItem(req.body);
            res.status(201).json(item);
        } catch (err) {
            res.status(500).json({ message: 'Error adding item', error: err });
        }
    }

    async _getStoresByItemAndLocation(req, res) {
        const { itemId } = req.params;
        const { longitude, latitude } = req.query;
    }

    //REGULAR

    async _getItemById(req, res) {
        try {
            const { itemId } = req.params
            const item = await this.database.getItemById(itemId)

            if(!item) {
                return res.status(404).json({message: "Item not found"});
            }

            return res.status(200).json(item)
        } catch(err) {
            res.status(500).json({message: "Error fetching item", error: err})
        }
    }

    async _getAllItems(req, res) {
        try {
            const items = await this.database.getAllItems();
            res.status(200).json(items);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching items', error: err });
        }
    }
    

    async _joinWaitlist(req, res) {
        const { email } = req.body;
        try {
            const savedEmail = await this.database.addEmailToWaitlist(email);
            res.status(201).json({ message: 'Email added to waitlist', email: savedEmail });
        } catch (err) {
            if (err.message === 'Email already exists in the waitlist') {
                return res.status(409).json({ message: err.message });
            }
            res.status(500).json({ message: 'Error adding email to waitlist', error: err.message });
        }
    }
      
    /**
     * 
     * STORE SPEICIFC ENDPOINTS
     */


    async findNearestWalmartStore(postalCode) {
        //https://www.walmart.com/store-finder?location=53562 
        // basically make a system that uses a browser pool that is always on that just changes the zipcode and finds the nearest store and its ID
        if(this.scraper.sessionCookies[postalCode]) {
            return this.scraper.sessionCookies[postalCode].storeId
        }
        // finish later

    }
    // basically because each schema will store data differenbly this basically returns the data based on whatever store
    async filterSchemaByStore(store, productId, postalCode) {
        switch(store) {
            case 'walmart':
                //console.log(1)
                //const productId = item.storeIds[store]
                let schema = this.database[config.stores[store].schema]
                if(postalCode) {
                    let nearestStore = await this.findNearestWalmartStore(postalCode)
                    return await schema.findOne({ productId: productId, storeId: nearestStore}).lean()
                } else {
                    return await schema.findOne({ productId: productId}).lean()
                }
            default:
                break;
        }
    }

    async _getPricesById(req, res) {
        try {
            const { itemId, postalCode } = req.params

            const item = await this.database.getItemById(itemId)
            
            if(!item) throw new Error("Item not found")
            if(!item.storeIds || item.storeIds.size <= 0) throw new Error("No store data available")

            const allPrices = {}
            const currentTime = new Date()
            const oneDayAgo = new Date(currentTime.getTime() - (24 * 60 * 60 *1000));


            if(item.lastUpdated && item.lastUpdated < oneDayAgo) {
                const pricePromises = []

                for(const [store, productId] of item.storeIds.entries()) {
                    const pricePromise = (async () => {
                        let foundData = await this.scraper.filterProductData(await this.scraper.getProductPrice(productId, store, postalCode), store)

                        return { store, foundData }
                    })()
                    pricePromises.push(pricePromise)
                }

                const results = await Promise.all(pricePromises)
                results.forEach(({ store, foundData}) => {
                    allPrices[store] = foundData
                })

                await this.database.updateItem(item._id, {
                    lastUpdated: new Date()
                })
            } else {                
                for(const [store, productId] of item.storeIds.entries()) {
                    let foundData = await this.filterSchemaByStore(store, productId, postalCode)

                    if(!foundData) {
                        foundData = await this.scraper.filterProductData(await this.scraper.getProductPrice(productId, store, postalCode), store)
                    }

                    if(foundData) {
                        allPrices[store] = foundData
                    }
                }
            }

            return res.status(200).json(allPrices)
        } catch(err) {
            return res.status(500).json({ message: "Error fetching item", error: err.message})
        }
    }
}

module.exports = API