require('dotenv').config();
require('module-alias/register')
const APIManager =  require('./API');
const ScrapeManager = require("./Scraper")
const DatabaseManager = require('./Database');

const Database = new DatabaseManager();
const Scraper = new ScrapeManager(Database);

Database._connect().then(async () => {
    console.log("Starting API Server");

    const API = new APIManager(Database, Scraper);

    await Scraper.initCluster()
    try {
        //const walmartPriceData = await Scraper.getProductPrice(447565750, "walmart")
        //console.log("Walmart Price Data:", walmartPriceData)

        //const costcoPriceData = await Scraper.getProductPrice(4000153042, "costco")
        //console.log("Costco Price Data:", costcoPriceData)

    } catch (err) {
        console.error("Error while scraping:", err)
    } finally {
        //await Scraper.closeCluster()
    }
}).catch((err) => console.warn(err))