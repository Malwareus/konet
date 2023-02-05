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

    // GAMESATIŞ VERİ (BAŞLANGIÇ)
    await page.goto('https://www.gamesatis.com/knight-online-goldbar');
    const gmsContainer = await page.waitForSelector('.goldbar-container');
    const gmsPrices = await gmsContainer.$$('.goldbar-row-price');
    const gmsName = await gmsContainer.$$('.goldbar-row-name')
    for (let i = 0; i < gmsName.length; i++) {
        const buyPrice = await page.evaluate(price => price.textContent.match(/\d+(\.\d+)?/g).join('.'), gmsPrices[i * 2]);
        const sellPrice = await page.evaluate(price => price.textContent.match(/\d+(\.\d+)?/g).join('.'), gmsPrices[i * 2 + 1]);
        const sql = 'UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = $3 AND (site_id= 1)';
        await pool.query(sql, [buyPrice,sellPrice, i+1]);
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
        const priceDuzelt = await page.evaluate( klasNameCek => klasNameCek.textContent.split(" ").pop().replace("M",""), klasNameCek[i]);
        const klasBuyPrices = parseFloat(await page.evaluate(klasBuy => klasBuy.textContent.match(/\d+(\.\d+)?/g).join('.'), klasBuy[i])) * parseFloat(priceDuzelt);
        const klasSellPrices = parseFloat(await page.evaluate(klasSell => klasSell.textContent.match(/\d+(\.\d+)?/g).join('.'), klasSell[i])) * parseFloat(priceDuzelt);
        const klasName = await page.evaluate( klasNameCek => klasNameCek.textContent.split(" ")[0].replace('\n','').toUpperCase(), klasNameCek[i])
        console.log(klasBuyPrices, klasSellPrices)
        const sql = `UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 2)`;
        await pool.query(sql, [klasBuyPrices, klasSellPrices, klasName])
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
        const priceDuzelt = await page.evaluate(oyunEksNameFind => oyunEksNameFind.textContent.split(" ").pop().replace("m"," "), oyunEksNameFind[i]);
        const oyunEksBuyPrices = parseFloat(await page.evaluate(oyunEksBuy => oyunEksBuy.textContent.replace(/\n/g, "").replace(/[^0-9,]/g, "").replace(',','.'), oyunEksBuy[i])) * parseFloat(priceDuzelt);
        const oyunEksSellPrices = parseFloat(await page.evaluate(oyunEksSell => oyunEksSell.textContent.replace(/\n/g, "").replace(/[^0-9,]/g, "").replace(',','.'), oyunEksSell[i])) * parseFloat(priceDuzelt);
        const oyunEksName = await page.evaluate( oyunEksNameCek => oyunEksNameCek.textContent.split(" ")[2].toUpperCase(), oyunEksNameCek[i])
        const sql = `UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 3)`;
        await pool.query(sql, [oyunEksBuyPrices, oyunEksSellPrices, oyunEksName])
    }

    // OYUNEKS VERİ (BİTİŞ)

    // ----- //

    // VATANGAME VERİ (BAŞLANGIÇ)

    await page.goto('https://www.vatangame.com/oyun-parasi/knight-online-gold-bar');
    const vatanGameContainer = await page.waitForSelector('.gm-products');
    const vatanGameBuy = await vatanGameContainer.$$('span.d-block.gm-product-price');
    const vatanGameSell = await vatanGameContainer.$$('.gm-product-price.mt-4.mt-lg-0.align-self-center.w-50');
    const vatanGameNameCek = await vatanGameContainer.$$('.gm-product-caption');
    for (let i = 0; i < vatanGameBuy.length; i++) {
        const priceDuzelt = await page.evaluate( vatanGameNameCek => vatanGameNameCek.textContent.split(" ")[3], vatanGameNameCek[i])
        const vatanGameBuyPrices = parseFloat(await page.evaluate(vatanGameBuy => vatanGameBuy.innerHTML.match(/<b>(.*?)<\/b>/)[1].replace(" TL", ""), vatanGameBuy[i])) * parseFloat(priceDuzelt);
        const vatanGameSellPrices = parseFloat(await page.evaluate(vatanGameSell => vatanGameSell.innerHTML.replace(" TL", ""), vatanGameSell[i])) * parseFloat(priceDuzelt);
        const vatanGameName = await page.evaluate( vatanGameNameCek => vatanGameNameCek.textContent.split(" ")[2].toUpperCase().replace(/İ/g, "I"), vatanGameNameCek[i])
        const sql = `UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 4)`;
        await pool.query(sql, [vatanGameBuyPrices, vatanGameSellPrices, vatanGameName])
    }

    // VATANGAME VERİ (BİTİŞ)

    // ----- //

    // BYNOGAME VERİ (BAŞLANGIÇ)

    await page.goto('https://www.bynogame.com/tr/oyunlar/knight-online/gold-bar');
    const bynoGameContainer = await page.waitForSelector('.col-lg-24.col-md-24.col-xl-18.order-1.order-sm-12');
    const bynoGameSell = await bynoGameContainer.$$('.col-19.col-md-24');
    const bynoGameBuy = await bynoGameContainer.$$("form[action='/tr/satis-onay'] button[type='submit']");
    const bynoGameNameCek = await bynoGameContainer.$$('h2.font-weight-bolder.text-left');
    for (let i = 0; i < bynoGameBuy.length; i++) {
        const bynoGameBuyPrices = await page.evaluate(bynoGameBuy => bynoGameBuy.innerText.split(" ")[0].replace(",","."), bynoGameBuy[i]);
        const bynoGameSellPrices = await page.evaluate(bynoGameSell => bynoGameSell.textContent.split(" ")[0].replace(",","."), bynoGameSell[i]);
        const bynoGameName = await page.evaluate( bynoGameNameCek => bynoGameNameCek.innerText.split(" ")[2].toUpperCase(), bynoGameNameCek[i])
        const sql = `UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 5)`;
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
        const koPazarName = await page.evaluate( koPazarNameCek => koPazarNameCek.textContent.split(" ")[0].toUpperCase(), koPazarNameCek[i])

        const sql = `UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 6)`;
        await pool.query(sql, [koPazarBuyPrices, koPazarSellPrices, koPazarName])
    }

    // KOPAZAR VERİ (BİTİŞ)

    // ----- //

    // KABASAKALONLINE VERİ (BAŞLANGIÇ)

    await page.goto('https://www.kabasakalonline.com/knight-online/knight-online-goldbar');
    const kabasakalOnline = await page.waitForSelector('.product-list-a1');
    const kabasakalOnlineSell = await kabasakalOnline.$$('.sellto.waves-effect.waves-light');
    const kabasakalOnlineBuy = await kabasakalOnline.$$("span[data-type=\"price\"]");
    const kabasakalOnlineName = await kabasakalOnline.$$('h2.name');
    for (let i = 0; i < kabasakalOnlineBuy.length; i++) {
        const priceDuzelt = await page.evaluate( kabasakalOnlineName => kabasakalOnlineName.textContent.match(/\d+(\.\d+)?/)[0], kabasakalOnlineName[i])
        const ksoBuyPrices = parseFloat(await page.evaluate(kabasakalOnlineBuy => kabasakalOnlineBuy.textContent.replace(",","."), kabasakalOnlineBuy[i])) * parseFloat(priceDuzelt);
        const ksoSellPrices = parseFloat(await page.evaluate(kabasakalOnlineSell => kabasakalOnlineSell.textContent.split(" ")[2].replace(",","."), kabasakalOnlineSell[i])) * parseFloat(priceDuzelt);
        const ksoName = await page.evaluate( kabasakalOnlineName => kabasakalOnlineName.textContent.split(" ")[0].toUpperCase(), kabasakalOnlineName[i])

        const sql = `UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 7)`;
        await pool.query(sql, [ksoBuyPrices, ksoSellPrices, ksoName])
    }

    // KABASAKALONLINE VERİ (BİTİŞ)

    // ----- //

    // BURSAGB VERİ (BAŞLANGIÇ)

    await page.goto('https://www.bursagb.com/knight-online-gold');
    const bursaGbContainer = await page.waitForSelector('.ps-shopping.ps-tab-root.ml-0');
    const bursaGbBuy = await bursaGbContainer.$$(".ps-btn.mt-1.fs-13.py-2");
    const bursaGbSell = await bursaGbContainer.$$('.ps-product__price.text-right');
    const bursaGbNameCek = await bursaGbContainer.$$('.ps-product__title a');
    for (let i = 0; i < bursaGbBuy.length; i++) {
        const priceDuzelt = await page.evaluate( bursaGbNameCek => bursaGbNameCek.textContent.split(" ")[1].toUpperCase().replace("M",""), bursaGbNameCek[i])
        const bursaGbBuyPrices = parseFloat(await page.evaluate(bursaGbBuy => bursaGbBuy.textContent.split(" (")[1].split(")")[0], bursaGbBuy[i])) * parseFloat(priceDuzelt);
        const bursaGbSellPrices = parseFloat(await page.evaluate(bursaGbSell => bursaGbSell.textContent.replace(" TL","").replace(",","."), bursaGbSell[i])) * parseFloat(priceDuzelt);
        const bursaGbName = await page.evaluate( bursaGbNameCek => bursaGbNameCek.innerHTML.split(" ")[0].toUpperCase(), bursaGbNameCek[i])

        const sql = `UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 8)`;
        await pool.query(sql, [bursaGbBuyPrices, bursaGbSellPrices, bursaGbName])
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
        const gbGetir = await page.evaluate(oyunForSv => oyunForSv.textContent.split(" ")[3].replace("M",""), oyunForSv[i]);
        const oyunForBuyPrices = parseFloat(await page.evaluate(oyunForBuy => oyunForBuy.textContent.split(" ")[2], oyunForBuy[i])) * parseFloat(gbGetir);
        const oyunForSellPrices = parseFloat(await page.evaluate(oyunForSell => oyunForSell.textContent.replace(" TL",""), oyunForSell[i])) * parseFloat(gbGetir);
        const oyunForName = await page.evaluate( oyunForNameCek => oyunForNameCek.textContent.split(" ")[2].toUpperCase(), oyunForNameCek[i])

        const sql = `UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 9)`;
        await pool.query(sql, [oyunForBuyPrices, oyunForSellPrices, oyunForName])
    }

    // OYUNFOR VERİ (BİTİŞ)

    await browser.close();
});


//const cronJob = cron.job("0 */3 * * * *", function() {
//   request('http://localhost:3000/test', function (error, response, body) {
//        console.log('Cron job is running');
//    });
//});
//cronJob.start();






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

    //GameSatış'a ait fiyatlar çekilip, anasayfaya gönderiliyor.
    const resGms = await pool.query("SELECT * FROM prices WHERE site_id = 1 ORDER BY server_id ASC");
    socket.emit("GameSatisData", resGms.rows);

    //Sunucu isimleri çekiliyor.
    const sunucuID = await pool.query("SELECT prices.server_id, servers.name FROM prices JOIN servers ON prices.server_id = servers.server_id WHERE site_id = 1 ORDER BY servers.server_id ASC ;")
    socket.emit("serverNames", sunucuID.rows);

    const resKg = await pool.query("SELECT * FROM prices WHERE site_id = 2 ORDER BY server_id ASC");
    socket.emit("KlasGameData", resKg.rows);

    const resOe = await pool.query("SELECT * FROM prices WHERE site_id = 3 ORDER BY server_id ASC");
    socket.emit("oyunEksData", resOe.rows);

    const resVg = await pool.query("SELECT * FROM prices WHERE site_id = 4 ORDER BY server_id ASC");
    socket.emit("vatanGameData", resVg.rows);

    const resBg = await pool.query("SELECT * FROM prices WHERE site_id = 5 ORDER BY server_id ASC");
    socket.emit("bynoGameData", resBg.rows);

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

        socket.on("kabasakalPrices", async (data) => {
        for (let i = 0; i < data.length; i++) {
            const queryText = `UPDATE prices SET buy_price = $1, sell_price =$2 WHERE server_id= (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 7)`;
            const values = [data[i].kabasakalOnlineBuy, data[i].kabasakalOnlineSell, data[i].kabasakalName];
            try {
                const res = await pool.query(queryText, values);

            } catch (err) {
                console.log(err.stack);
            }
        }
        });

    const resKso = await pool.query("SELECT * FROM prices WHERE site_id = 7 ORDER BY server_id ASC");
    socket.emit("kabasakalData", resKso.rows);


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
    const resBursa = await pool.query("SELECT * FROM prices WHERE site_id = 8 ORDER BY server_id ASC");
    socket.emit("BursaGbData", resBursa.rows);


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

    const resOf = await pool.query("SELECT * FROM prices WHERE site_id = 9 ORDER BY server_id ASC");
    socket.emit("oyunForData", resOf.rows);

});



server.listen(3000)