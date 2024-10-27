# PricePal Backend

![License](https://img.shields.io/github/license/decompi/pricepal-backend)
![Issues](https://img.shields.io/github/issues/decompi/pricepal-backend)
![Stars](https://img.shields.io/github/stars/decompi/pricepal-backend?style=social)

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
  - [Completed Features](#completed-features)
  - [Upcoming Features](#upcoming-features)
- [Technologies](#technologies)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Introduction

**PricePal Backend** is the server-side component of the PricePal application, an open-source full-stack MERN (MongoDB, Express, React, Node.js) project. This backend handles all essential operations, including web scraping for price data, database management, user authentication, and providing APIs for the frontend to consume.

## Features

### Completed Features

- **Web Scraping:** Automatically fetches and updates price data from various online stores.
- **Database Management:** Utilizes MongoDB to store user data, item information, and price comparisons.
- **RESTful APIs:** Provides endpoints for the frontend to interact with the database.
- **Caching Mechanisms:** Optimize performance with caching strategies for frequently accessed data.

### Upcoming Features

- **Real-Time Updates:** Implement live data push to frontend using WebSockets.
- **Advanced Scraping:** Enhance scraping capabilities to handle more complex websites and dynamic content.
- **Analytics Dashboard:** Provide insights and analytics on user behavior and pricing trends.
- **API Rate Limiting:** Implement rate limiting to secure APIs against abuse.

## Technologies

- **Node.js:** JavaScript runtime environment.
- **Express.js:** Web framework for building APIs.
- **MongoDB:** NoSQL database for data storage.
- **Mongoose:** ODM (Object Data Modeling) library for MongoDB.
- **Cheerio:** For web scraping tasks.
- **JWT:** For secure user authentication.
- **dotenv:** Manages environment variables.
- **Puppeteer:** For browser automation and scraping.
- **puppeteer-extra & stealth plugin:** To bypass bot detection.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js:** Installed on your machine. [Download Node.js](https://nodejs.org/)
- **MongoDB:** Installed and running. [Download MongoDB](https://www.mongodb.com/try/download/community)
- **Git:** Installed on your machine. [Download Git](https://git-scm.com/)

## Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/decompi/pricepal-backend.git
   ```
2. **Navigate to the Project Directory:**
   ```bash
   cd pricepal-backend
   ```
3. **Install Dependencies:**
   ```bash
   npm install
   ```

## Configuration

1. **Environment Variables:**
   
   Create a `.env` file in the root directory and add the following variables:
   ```env
   PORT=8196
   MONGODB_URI=mongodb+srv:yourmongodb
   API_KEY=your_api_key
   ```
   
   - **PORT:** Port number on which the server will run.
   - **MONGODB_URI:** MongoDB connection string.
   - **API_KEY:** Secret key for middleware authentication.

2. **Database Setup:**
   
   Ensure MongoDB is installed and running. The application will automatically create the necessary databases and collections upon first run.

## Running the Server

Start the backend server with the following command:

```bash
npm start
```

The server will start on the port specified in the `.env` file (default is `8196`). You should see console logs indicating successful connection to MongoDB and server start.

## API Documentation

### Authentication

| Endpoint               | Method | Description                     | Status     |
|------------------------|--------|---------------------------------|------------|
| `/api/auth/register`   | POST   | Registers a new user            | ❌ Not Done |
| `/api/auth/login`      | POST   | Logs in an existing user        | ❌ Not Done |
| `/api/auth/logout`     | POST   | Logs out the current user       | ❌ Not Done |

### Items

| Endpoint                     | Method | Description                               | Status     |
|------------------------------|--------|-------------------------------------------|------------|
| `/api/v1/items`              | GET    | Retrieves a list of all items             | ✅ Done    |
| `/api/v1/items/:itemId`      | GET    | Retrieves a specific item by its ID        | ✅ Done    |
| `/api/v1/items`              | POST   | Adds a new item to the database            | ✅ Done    |
| `/api/v1/items/:itemId`      | PUT    | Updates an existing item by its ID          | ❌ Not Done |
| `/api/v1/items/:itemId`      | DELETE | Deletes an item by its ID                   | ❌ Not Done |

### Cart

| Endpoint               | Method | Description                           | Status     |
|------------------------|--------|---------------------------------------|------------|
| `/api/cart`            | GET    | Retrieves the current user's cart     | ✅ Done    |
| `/api/cart`            | POST   | Adds an item to the user's cart        | ✅ Done    |
| `/api/cart/:itemId`    | DELETE | Removes an item from the user's cart    | ❌ Not Done |

### Price Comparison

| Endpoint               | Method | Description                                         | Status     |
|------------------------|--------|-----------------------------------------------------|------------|
| `/api/compare`         | GET    | Compares prices of items in the user's cart          | ❌ Not Done |
| `/api/compare/summary` | GET    | Provides a summary of price comparisons               | ❌ Not Done |

### Waitlist

| Endpoint               | Method | Description                           | Status     |
|------------------------|--------|---------------------------------------|------------|
| `/api/v1/join-waitlist`| POST   | Adds a user's email to the waitlist    | ✅ Done    |

*For detailed API usage, refer to the [API Documentation](./API_DOCUMENTATION.md).*

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the Repository**
2. **Create a Branch:**
   ```bash
   git checkout -b feature/YourFeature
   ```
3. **Commit Your Changes:**
   ```bash
   git commit -m "Add Your Feature"
   ```
4. **Push to the Branch:**
   ```bash
   git push origin feature/YourFeature
   ```
5. **Open a Pull Request**

Please ensure your code adheres to the project's coding standards and passes all tests.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

- **Project Link:** [https://github.com/decompi/pricepal-backend](https://github.com/decompi/pricepal-backend)
- **Frontend Repository:** [PricePal Frontend](https://github.com/decompi/pricepal)

---

Thank you for contributing to PricePal! 🚀