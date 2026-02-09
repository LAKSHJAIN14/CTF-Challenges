const puppeteer = require('puppeteer');

const sleep = ms => new Promise(res => setTimeout(res, ms));

const CONFIG = {
    APPURL: process.env['APPURL'] || "http://localhost:8012/",
    APPFLAG: process.env['APPFLAG'] || "n0obCTF{l0v3_n0t3s_cl1pb04rd_h1j4ck}",
    APPLIMITTIME: Number(process.env['APPLIMITTIME'] || "60"),
    APPLIMIT: Number(process.env['APPLIMIT'] || "5"),
}

console.table(CONFIG)


const initBrowser = puppeteer.launch({
    headless: 'new',
    args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-translate',

    ],
    ignoreHTTPSErrors: true
});

console.log("Bot started...");

module.exports = {
    rateLimit: {
            windowS: CONFIG.APPLIMITTIME,
            max: CONFIG.APPLIMIT
        },
    visitURL : async(urlToVisit) => {
        const browser = await initBrowser;
        const context = await browser.createBrowserContext()
        context.overridePermissions(undefined, ['clipboard-read', 'clipboard-write']);
        try {

            
            const page = await context.newPage();
            url = CONFIG.APPURL;
            console.log(`domain: ${new URL(url).hostname}`)
            await page.setCookie({ 
                name: 'flag', 
                value: CONFIG.APPFLAG, 
                domain: new URL(url).hostname, 
                httpOnly: true,
                sameSite: 'Strict'
            });
            console.log(`bot visiting ${urlToVisit}`)
            await page.goto(urlToVisit, {
                timeout: 5000,
                waitUntil: 'domcontentloaded'
            });
            if (await page.$('#reveal-btn')) {
            await page.click('#reveal-btn'); 
        }
            await sleep(2000)

            // Close
            console.log("browser close...")
            await context.close()
            return true;

        } catch (e) {
            console.error(e);
            await context.close();
            return false;
    }  

}}