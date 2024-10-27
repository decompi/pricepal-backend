const { connect, Schema, model } = require('mongoose');

class Database {
    constructor() {
        this.itemSchema = model('items', new Schema({
            name: { type: String, required: true },
            description: String,
            category: [String],
            imageUrl: [String],
            brand: String,
            lastUpdated: { type: Date, default: Date.now },
            storeIds: {
                type: Map,
                of: String,
                default: {}
            },
            staticPrice: { type: Number, default: null }
        }));
        

        /*const newItem = new this.itemSchema({
            name: "Sony PS5 - Digital Edition",
            description: "Sony PlayStation_PS5 Video Game Console (Digital Edition) - PlayStation - 5",
            category: ["Electronics"],
            imageUrl: "https://i5.walmartimages.com/seo/Sony-PlayStation-PS5-Video-Game-Console-Digital-Edition-PlayStation-5_bea7e15f-fec5-46e8-a3a2-bec6a0227406.37f3ebbd472905a8691514e0656e5cab.jpeg",
            brand: "Sony",
            storeIds: {
                walmart: 447565750
            }
        }).save()*/
        /*this.storeSchema = model('stores', new Schema({
            name: { type: String, required: true },
            address: String,
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true },
        }));*/

        this.walmartSchema = model('walmartprices', new Schema({
            storeId: { type: String, ref: 'stores', required: true },
            productId: { type: String, ref: 'items', required: true },
            price: { type: Number, default: null },
            availability: { type: Boolean, default: true },
            lastUpdated: { type: Date, default: Date.now },
            gtin13: { type: String, required: false}
        }))

        this.costcoSchema = model('costcoprices', new Schema({
            storeId: { type: String, ref: 'stores', required: true },
            productId: { type: String, ref: 'items', required: true },
            price: { type: Number, default: null },
            lastUpdated: { type: Date, default: Date.now }
        }))

        this.targetSchema = model('targetprices', new Schema({
            storeId: { type: String, ref: 'stores', required: true },
            productId: { type: String, ref: 'items', required: true },
            price: { type: Number, default: null },
            lastUpdated: { type: Date, default: Date.now },
            tcin: { type: String, required: false } 
        }));        


        this.profileSchema = model('profiles', new Schema({
            userId: String,
            name: String,
            cart: [{
                itemId: { type: Schema.Types.ObjectId, ref: 'items' },
                storeId: { type: Schema.Types.ObjectId, ref: 'stores' },
                priceAtTime: Number,
                quantity: Number
            }]
        }))

        this.waitlistSchema = model('waitlist', new Schema({
            email: { type: String, required: true, unique: true },
            joinedAt: { type: Date, default: Date.now }
        }))   
    }

    async _connect() {
        try {
            await connect(process.env.mongo);
            console.log('Connected to Database');
        } catch (err) {
            console.error('Database connection error', err);
        }
    }

    async addItem(itemData) {
        const newItem = new this.itemSchema(itemData);
        return newItem.save();
    }

    async addStore(storeData) {
        const newStore = new this.storeSchema(storeData);
        return newStore.save();
    }

    async updateStorePrice(storeId, productId, price, availability = true) {
        return await this.storePriceSchema.findOneAndUpdate(
            { storeId, productId },
            { $set: { price, availability, lastUpdated: Date.now() } },
            { upsert: true, new: true }
        );
    }

    async getProductPrices(productId) {
        return await this.storePriceSchema.find({ productId }).populate('storeId productId');
    }

    async addEmailToWaitlist(email) {
        const existingEmail = await this.waitlistSchema.findOne({ email: email.toLowerCase() });
        
        if (existingEmail) {
            throw new Error('Email already exists in the waitlist');
        }
        const newEmail = new this.waitlistSchema({ email });
        return newEmail.save();
    }
    

    async getAllItems() {
        return await this.itemSchema.find();
    }

    async getItemByName(name) {
        return await this.itemSchema.findOne({ name });
    }

    async getItemById(itemId) {
        return await this.itemSchema.findById(itemId);
    }    

    async deleteItem(productId) {
        await this.storePriceSchema.deleteMany({ productId });
        return this.itemSchema.findByIdAndDelete(productId);
    }

    async updateItem(itemId, itemData) {
        return this.itemSchema.findByIdAndUpdate(
            itemId,
            { $set: itemData, lastUpdated: Date.now() },
            { new: true }
        );
    }

    async addItemToCart(userId, itemId, storeId, priceAtTime, quantity = 1) {
        return this.profileSchema.findOneAndUpdate(
            { userId },
            { $push: { cart: { itemId, storeId, priceAtTime, quantity } } },
            { new: true, upsert: true }
        );
    }

    async getCart(userId) {
        return this.profileSchema.findOne({ userId }).populate('cart.itemId cart.storeId');
    }

    async removeItemFromCart(userId, itemId) {
        return this.profileSchema.findOneAndUpdate(
            { userId },
            { $pull: { cart: { itemId } } },
            { new: true }
        );
    }

    async clearCart(userId) {
        return this.profileSchema.findOneAndUpdate(
            { userId },
            { $set: { cart: [] } },
            { new: true }
        );
    }

    async getAllStores() {
        return await this.storeSchema.find();
    }

    async getStoreById(storeId) {
        return this.storeSchema.findById(storeId);
    }

    async getStorePrices(storeId) {
        return this.storePriceSchema.find({ storeId }).populate('productId');
    }

    async deleteStore(storeId) {
        await this.storePriceSchema.deleteMany({ storeId });
        return this.storeSchema.findByIdAndDelete(storeId);
    }
}

module.exports = Database;