const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const {Pool,Client} = require('pg')
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const {executablePath} = require('puppeteer');
const cron = require('cron');
const request = require('request');
const path = require("path");

puppeteer.use(StealthPlugin());

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html")
})

app.use("/panel", express.static(path.join(__dirname, "panel")));

app.get('/test', async (req, res) => {
    puppeteer.use(StealthPlugin())
    const browser = await puppeteer.launch({
        args: ['--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-zygote',
            '--disable-gpu'],
        headless: false,
        ignoreHTTPSErrors: true,
        executablePath: executablePath(),
    })
    const page = await browser.newPage()
    await page.setViewport({
        width: 1920,
        height: 1280,
        deviceScaleFactor: 1,
    });
try {


    // GAMESATIŞ VERİ (BAŞLANGIÇ)
    await page.goto('https://www.gamesatis.com/knight-online-goldbar');
    const gmsContainer = await page.waitForSelector('.goldbar-container');
    const gmsPrices = await gmsContainer.$$('.goldbar-row-price');
    const gmsName = await gmsContainer.$$('.goldbar-row-name')
    for (let i = 0; i < gmsName.length; i++) {
        const buyPrice = await page.evaluate(price => price.textContent.match(/\d+(\.\d+)?/g).join('.'), gmsPrices[i * 2]);
        const sellPrice = await page.evaluate(price => price.textContent.match(/\d+(\.\d+)?/g).join('.'), gmsPrices[i * 2 + 1]);
        const sql = 'UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = $3 AND (site_id= 1)';
        await pool.query(sql, [buyPrice, sellPrice, i + 1]);
    }
    // GAMESATIŞ VERİ (BİTİŞ)

    // ----- //

    // KLASGAME VERİ (BAŞLANGIÇ)
    await page.goto('https://www.klasgame.com/knightonline/knight-online-gb-goldbar-premium-cash');
    const klasContainer = await page.waitForSelector('#urunler');
    const klasBuy = await klasContainer.$$('.product-price.margin-right-10.price');
    const klasSell = await klasContainer.$$('.product-button-area');
    const klasNameCek = await klasContainer.$$('.product-title[data-type="object-name"]');
    for (let i = 0; i < klasNameCek.length; i++) {
        const priceDuzelt = await page.evaluate(klasNameCek => klasNameCek.textContent.split(" ").pop().replace("M", ""), klasNameCek[i]);
        const klasBuyPrices = Number(await page.evaluate(klasBuy => klasBuy.textContent.match(/\d+(\.\d+)?/g).join('.'), klasBuy[i]));
        const klasSellPrices = Number(await page.evaluate(klasSell => klasSell.textContent.match(/\d+(\.\d+)?/g).join('.'), klasSell[i]));
        const klasName = await page.evaluate(klasNameCek => klasNameCek.textContent.split(" ")[0].replace('\n', '').toUpperCase(), klasNameCek[i])
        let adjustedBuyPrice = klasBuyPrices;
        let adjustedSellPrice = klasSellPrices;
        if (priceDuzelt === '1') {
            adjustedBuyPrice *= 100;
            adjustedSellPrice *= 100;
        } else if (priceDuzelt === '10') {
            adjustedBuyPrice *= 10;
            adjustedSellPrice *= 10;
        }
        const roundedNumSell = Math.round(adjustedBuyPrice * 100) / 100;
        const roundedNumBuy = Math.round(adjustedSellPrice * 100) / 100;
        const sql = `UPDATE prices
                     SET buy_price  = $1,
                         sell_price = $2
                     WHERE server_id = (SELECT server_id FROM servers WHERE name = $3)
                       AND (site_id = 2)`;
        await pool.query(sql, [roundedNumBuy, roundedNumSell, klasName])
    }
    // KLASGAME VERİ (BİTİŞ)

    // ----- //

    // OYUNEKS VERİ (BAŞLANGIÇ)

    await page.goto('https://oyuneks.com/game-gold/knight-online-goldbar-alim-satim');
    const oyunEksContainer = await page.waitForSelector('.items-collection-wrapper');
    const oyunEksBuy = await oyunEksContainer.$$('.satinal h5');
    const oyunEksSell = await oyunEksContainer.$$('.satis h5');
    const oyunEksNameCek = await oyunEksContainer.$$('.item-col-center h5');
    const oyunEksNameFind = await oyunEksContainer.$$('.heading-secondary');
    for (let i = 0; i < oyunEksBuy.length; i++) {
        const priceDuzelt = await page.evaluate(oyunEksNameFind => oyunEksNameFind.textContent.split(" ").pop().replace("m", ""), oyunEksNameFind[i]);
        const oyunEksBuyPrices = Number(await page.evaluate(oyunEksBuy => oyunEksBuy.textContent.replace(/\n/g, "").replace(/[^0-9,]/g, "").replace(',', '.'), oyunEksBuy[i]));
        const oyunEksSellPrices = Number(await page.evaluate(oyunEksSell => oyunEksSell.textContent.replace(/\n/g, "").replace(/[^0-9,]/g, "").replace(',', '.'), oyunEksSell[i]));
        const oyunEksName = await page.evaluate(oyunEksNameCek => oyunEksNameCek.textContent.split(" ")[2].toUpperCase(), oyunEksNameCek[i])
        let adjustedBuyPrice = oyunEksBuyPrices;
        let adjustedSellPrice = oyunEksSellPrices;
        if (Number(priceDuzelt) == '1') {
            adjustedBuyPrice *= 100;
            adjustedSellPrice *= 100;
        } else if (Number(priceDuzelt) == '10') {
            adjustedBuyPrice *= 10;
            adjustedSellPrice *= 10;
        } else if (Number(priceDuzelt) == '100') {
            adjustedBuyPrice *= 1;
            adjustedSellPrice *= 1;
        }
        const sql = `UPDATE prices
                     SET buy_price  = $1,
                         sell_price = $2
                     WHERE server_id = (SELECT server_id FROM servers WHERE name = $3)
                       AND (site_id = 3)`;
        await pool.query(sql, [adjustedBuyPrice, adjustedSellPrice, oyunEksName])
        console.log(adjustedBuyPrice,adjustedSellPrice,priceDuzelt)
    }

    // OYUNEKS VERİ (BİTİŞ)

    // ----- //

    // VATANGAME VERİ (BAŞLANGIÇ)
    try {
    await page.goto('https://www.vatangame.com/oyun-parasi/knight-online-gold-bar');
    const vatanGameContainer = await page.waitForSelector('.gm-products');
    const vatanGameBuy = await vatanGameContainer.$$('span.d-block.gm-product-price');
    const vatanGameSell = await vatanGameContainer.$$('.gm-product-price.mt-4.mt-lg-0.align-self-center.w-50');
    const vatanGameNameCek = await vatanGameContainer.$$('.gm-product-caption');
    for (let i = 0; i < vatanGameBuy.length; i++) {
        const priceDuzelt = await page.evaluate(vatanGameNameCek => vatanGameNameCek.textContent.split(" ")[3].toUpperCase(), vatanGameNameCek[i])
        const vatanGameBuyPrices = Number(await page.evaluate(vatanGameBuy => vatanGameBuy.innerHTML.match(/<b>(.*?)<\/b>/)[1].replace(" TL", ""), vatanGameBuy[i]));
        const vatanGameSellPrices = Number(await page.evaluate(vatanGameSell => vatanGameSell.innerHTML.replace(" TL", ""), vatanGameSell[i]));
        const vatanGameName = await page.evaluate(vatanGameNameCek => vatanGameNameCek.textContent.split(" ")[2].toUpperCase().replace(/İ/g, "I"), vatanGameNameCek[i])
        let adjustedBuyPrice = vatanGameBuyPrices;
        let adjustedSellPrice = vatanGameSellPrices;
        if (priceDuzelt === '1') {
            adjustedBuyPrice *= 100;
            adjustedSellPrice *= 100;
        } else if (priceDuzelt === '10') {
            adjustedBuyPrice *= 10;
            adjustedSellPrice *= 10;
        }
        const roundedNumSell = Math.round(adjustedBuyPrice * 100) / 100;
        const roundedNumBuy = Math.round(adjustedSellPrice * 100) / 100;
        const sql = `UPDATE prices
                     SET buy_price  = $1,
                         sell_price = $2
                     WHERE server_id = (SELECT server_id FROM servers WHERE name = $3)
                       AND (site_id = 4)`;
        await pool.query(sql, [roundedNumBuy, roundedNumSell, vatanGameName])

    }
    } catch (error) {}

    // VATANGAME VERİ (BİTİŞ)

    // ----- //

    // BYNOGAME VERİ (BAŞLANGIÇ)

    await page.goto('https://www.bynogame.com/tr/oyunlar/knight-online/gold-bar');
    const bynoGameContainer = await page.waitForSelector('.col-lg-24.col-md-24.col-xl-18.order-1.order-sm-12');
    const bynoGameSell = await bynoGameContainer.$$('.col-19.col-md-24');
    const bynoGameBuy = await bynoGameContainer.$$("form[action='/tr/satis-onay'] button[type='submit']");
    const bynoGameNameCek = await bynoGameContainer.$$('h2.font-weight-bolder.text-left');
    for (let i = 0; i < bynoGameBuy.length; i++) {
        const bynoGameBuyPrices = parseFloat(await page.evaluate(bynoGameBuy => bynoGameBuy.innerText.split(" ")[0].replace(",", "."), bynoGameBuy[i]));
        const bynoGameSellPrices = parseFloat(await page.evaluate(bynoGameSell => bynoGameSell.textContent.split(" ")[0].replace(",", ".").replace("TRYTL", ""), bynoGameSell[i]));
        const bynoGameName = await page.evaluate(bynoGameNameCek => bynoGameNameCek.innerText.split(" ")[2].toUpperCase(), bynoGameNameCek[i])
        const sql = `UPDATE prices
                     SET buy_price  = $1,
                         sell_price = $2
                     WHERE server_id = (SELECT server_id FROM servers WHERE name = $3)
                       AND (site_id = 5)`;
        await pool.query(sql, [bynoGameBuyPrices, bynoGameSellPrices, bynoGameName])
    }

    // BYNOGAME VERİ (BİTİŞ)

    // ----- //

    // KOPAZAR VERİ (BAŞLANGIÇ)

    await page.goto('https://www.kopazar.com/knight-online-gold-bar');
    const koPazarContainer = await page.waitForSelector('.container-desktop');
    const koPazarSell = await koPazarContainer.$$('strong.caret-up');
    const koPazarBuy = await koPazarContainer.$$(".col-xl-3.col-lg-6.col-sm-3.col-6.order-xl-3.order-lg-2.order-sm-3.order-2.xl-text-right.text-center");
    const koPazarNameCek = await koPazarContainer.$$('.col-xl-3.col-lg-4.col-md-10.col-sm-6.col-9 h2');
    for (let i = 0; i < koPazarBuy.length; i++) {
        const koPazarBuyPrices = await page.evaluate(koPazarBuy => koPazarBuy.textContent.match(/\d+(\.\d+)?/g), koPazarBuy[i]) * 10;
        const koPazarSellPrices = await page.evaluate(koPazarSell => koPazarSell.textContent.match(/\d+(\.\d+)?/g), koPazarSell[i]) * 10;
        const koPazarName = await page.evaluate(koPazarNameCek => koPazarNameCek.textContent.split(" ")[0].toUpperCase(), koPazarNameCek[i])

        const sql = `UPDATE prices
                     SET buy_price  = $1,
                         sell_price = $2
                     WHERE server_id = (SELECT server_id FROM servers WHERE name = $3)
                       AND (site_id = 6)`;
        await pool.query(sql, [koPazarBuyPrices, koPazarSellPrices, koPazarName])
    }

    // KOPAZAR VERİ (BİTİŞ)

    // ----- //

    // KABASAKALONLINE VERİ (BAŞLANGIÇ)

   /** await page.goto('https://www.kabasakalonline.com/knight-online/knight-online-goldbar');
    const kabasakalOnline = await page.waitForSelector('.product-list-a1');
    const kabasakalOnlineSell = await kabasakalOnline.$$('.sellto.waves-effect.waves-light');
    const kabasakalOnlineBuy = await kabasakalOnline.$$("span[data-type=\"price\"]");
    const kabasakalOnlineName = await kabasakalOnline.$$('h2.name');
    for (let i = 0; i < kabasakalOnlineBuy.length; i++) {
        const priceDuzelt = await page.evaluate(kabasakalOnlineName => kabasakalOnlineName.textContent.match(/\d+(\.\d+)?/)[0], kabasakalOnlineName[i])
        const ksoBuyPrices = parseFloat(await page.evaluate(kabasakalOnlineBuy => kabasakalOnlineBuy.textContent.replace(",", "."), kabasakalOnlineBuy[i])) * parseFloat(priceDuzelt);
        const ksoSellPrices = parseFloat(await page.evaluate(kabasakalOnlineSell => kabasakalOnlineSell.textContent.split(" ")[2].replace(",", "."), kabasakalOnlineSell[i])) * parseFloat(priceDuzelt);
        const ksoName = await page.evaluate(kabasakalOnlineName => kabasakalOnlineName.textContent.split(" ")[0].toUpperCase(), kabasakalOnlineName[i])

        const sql = `UPDATE prices
                     SET buy_price  = $1,
                         sell_price = $2
                     WHERE server_id = (SELECT server_id FROM servers WHERE name = $3)
                       AND (site_id = 7)`;
        await pool.query(sql, [ksoBuyPrices, ksoSellPrices, ksoName])
    }

    // KABASAKALONLINE VERİ (BİTİŞ) **/

    // ----- //

    // BURSAGB VERİ (BAŞLANGIÇ)

    await page.goto('https://www.bursagb.com/knight-online-gold');
    const bursaGbContainer = await page.waitForSelector('.ps-shopping.ps-tab-root.ml-0');
    const bursaGbBuy = await bursaGbContainer.$$(".ps-btn.mt-1.fs-13.py-2");
    const bursaGbSell = await bursaGbContainer.$$('.ps-product__price.text-right');
    const bursaGbNameCek = await bursaGbContainer.$$('.ps-product__title a');
    for (let i = 0; i < bursaGbBuy.length; i++) {
        const priceDuzelt = await page.evaluate(bursaGbNameCek => bursaGbNameCek.textContent.split(" ")[1].toUpperCase().replace("M", ""), bursaGbNameCek[i])
        const bursaGbBuyPrices = parseFloat((await page.evaluate(bursaGbBuy => bursaGbBuy.textContent.split(" (")[1].split(")")[0], bursaGbBuy[i])) * parseFloat(priceDuzelt)).toFixed(2);
        const bursaGbSellPrices = parseFloat(await page.evaluate(bursaGbSell => bursaGbSell.textContent.replace(" TL", "").replace(",", "."), bursaGbSell[i])) * parseFloat(priceDuzelt).toFixed(2);
        const bursaGbName = await page.evaluate(bursaGbNameCek => bursaGbNameCek.innerHTML.split(" ")[0].toUpperCase(), bursaGbNameCek[i])
        const roundedNumSell = Math.round(bursaGbSellPrices * 100) / 100;
        const roundedNumBuy = Math.round(bursaGbBuyPrices * 100) / 100;

        const sql = `UPDATE prices
                     SET buy_price  = $1,
                         sell_price = $2
                     WHERE server_id = (SELECT server_id FROM servers WHERE name = $3)
                       AND (site_id = 8)`;
        await pool.query(sql, [roundedNumBuy, roundedNumSell, bursaGbName])
    }

    // BURSAGB VERİ (BİTİŞ)

    // ----- //

    // OYUNFOR VERİ (BAŞLANGIÇ)

    await page.goto('https://www.oyunfor.com/knight-online/gb-gold-bar');
    const oyunForContainer = await page.waitForSelector('.flex-column.products');
    const oyunForBuy = await oyunForContainer.$$(".button.desktop.sellToUsBtn span");
    const oyunForSell = await oyunForContainer.$$('.notranslate[style="font-weight: bold;font-size:16px;align-self: flex-end;"]');
    const oyunForNameCek = await oyunForContainer.$$('h3.productText');
    const oyunForSv = await oyunForContainer.$$('.productText2');
    for (let i = 0; i < oyunForSell.length; i++) {
        const gbGetir = await page.evaluate(oyunForSv => oyunForSv.textContent.split(" ")[3].replace("M", ""), oyunForSv[i]);
        const oyunForBuyPrices = parseFloat(await page.evaluate(oyunForBuy => oyunForBuy.textContent.split(" ")[2], oyunForBuy[i])) * parseFloat(gbGetir);
        const oyunForSellPrices = parseFloat(await page.evaluate(oyunForSell => oyunForSell.textContent.replace(" TL", ""), oyunForSell[i])) * parseFloat(gbGetir);
        const oyunForName = await page.evaluate(oyunForNameCek => oyunForNameCek.textContent.split(" ")[2].toUpperCase(), oyunForNameCek[i])
        const roundedNumSell = Math.round(oyunForBuyPrices * 100) / 100;
        const roundedNumBuy = Math.round(oyunForSellPrices * 100) / 100;

        const sql = `UPDATE prices
                     SET buy_price  = $1,
                         sell_price = $2
                     WHERE server_id = (SELECT server_id FROM servers WHERE name = $3)
                       AND (site_id = 9)`;
        await pool.query(sql, [roundedNumBuy, roundedNumSell, oyunForName])
    }

    // OYUNFOR VERİ (BİTİŞ)
}
catch (error){
    console.log(error)
}
    await browser.close();
});


const cronJob = cron.job("0 */3 * * * *", function() {
   request('https://kogms.azurewebsites.net:443/test', function (error, response, body) {
        console.log('Cron job is running');
    });
});
cronJob.start();






// Veritabanı bağlantısı (Başlangıç)

const pool = new Pool({
    user:"postgres",
    host:"localhost",
    database:"konet",
    password:"root",
    port: 5432
})
pool.connect(function(err){
    if(err) throw err;
    console.log("Bağlandı")
})

// Veritabanı bağlantısı (Bitiş)




// Prices verilerinin update edildiği bölüm (başlangıç)
io.on("connection", async (socket) => {

    //Sunucu isimleri çekiliyor.
    const sunucuID = await pool.query("SELECT prices.server_id, servers.name FROM prices JOIN servers ON prices.server_id = servers.server_id WHERE site_id = 1 ORDER BY servers.server_id ASC ;")
    socket.emit("serverNames", sunucuID.rows);


    socket.on("koPazarPrices", async (data) => {
        for (let i = 0; i < data.length; i++) {
            const queryText = `UPDATE prices SET buy_price = $1, sell_price =$2 WHERE server_id= (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 6)`;
            const values = [data[i].koPazarBuyPrice, data[i].koPazarSellPrice, data[i].koPazarName];
            try {
                const res = await pool.query(queryText, values);
            } catch (err) {
                console.log(err.stack);
            }
        }
    });



    const resKp = await pool.query("SELECT * FROM prices WHERE site_id = 6 ORDER BY server_id ASC");
    socket.emit("koPazarData", resKp.rows);

        socket.on("bursaGbPrices", async (data) => {
            for (let i = 0; i < data.length; i++) {
                const queryText = `UPDATE prices SET buy_price = $1, sell_price =$2 WHERE server_id= (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 8)`;
                const values = [data[i].bursaGbBuy, data[i].bursaGbSell, data[i].bursaGbName];
                try {
                    const res = await pool.query(queryText, values);

                } catch (err) {
                    console.log(err.stack);
                }
            }
        });

    socket.on("oyunForPrices", async (data) => {
        for (let i = 0; i < data.length; i++) {
            const queryText = `UPDATE prices SET buy_price = $1, sell_price =$2 WHERE server_id= (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 9)`;
            const values = [data[i].oyunForGbBuy, data[i].oyunForGbSell, data[i].oyunForServerName];
            try {
                const res = await pool.query(queryText, values);

            } catch (err) {
                console.log(err.stack);
            }
        }
    });

    const res = await pool.query("SELECT * FROM prices WHERE site_id IN (1,2,3,4,5,6,8,9) ORDER BY site_id, server_id ASC");
    socket.emit("allData", res.rows);

});



server.listen(443)
