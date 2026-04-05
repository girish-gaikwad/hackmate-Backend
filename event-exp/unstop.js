// import { ApifyClient } from 'apify-client';

const  { ApifyClient } = require('apify-client');

// Initialize the ApifyClient with API token
const client = new ApifyClient({
    token: 'sample-api',
});

// Prepare Actor input
const input = {
    "startUrls": [
        {
            "url": "https://unstop.com/hackathons"
        }
    ],
    "maxItems": 20,
    "proxyConfiguration": {
        "useApifyProxy": true
    }
};

(async () => {
    // Run the Actor and wait for it to finish
    const run = await client.actor("RAOROdoZanwmW27ht").call(input);

    // Fetch and print Actor results from the run's dataset (if any)
    console.log('Results from dataset');
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    items.forEach((item) => {
        console.dir(item);
    });
})();
