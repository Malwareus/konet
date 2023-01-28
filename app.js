const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const {Pool,Client} = require('pg')
const cors = require('cors');
app.use(cors({
    origin: 'https://gamesatis.com',
    optionsSuccessStatus: 200
}));

// Sayfalandırma yaptığımız kısım (başlangıç)

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html")
})
app.get('/veri', (req,res)=>{
    res.sendFile(__dirname + "/veri.html")
})

// Sayfalandırma yaptığımız kısım (bitiş)




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

    //Bu bölümde GameSatış'tan gelen fiyat ve server isimleri yakalanıyor ve veri tabanında güncelleniyor.
    socket.on("gameSatisPrices", async (data) => {
        for (let i = 0; i < data.length; i++) {
            const queryText = `UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = $3 AND (site_id= 1)`;
            const values = [data[i].buy, data[i].sell, i + 1];
            try {
                const res = await pool.query(queryText, values);
            } catch (err) {
                console.log(err.stack);
            }
        }

        console.log(`GameSatış'tan gelen goldbar fiyatları güncellendi`);
        console.log(`Sunucu isimleri güncellendi`);
    });

    //GameSatış'a ait fiyatlar çekilip, anasayfaya gönderiliyor.
    const resGms = await pool.query("SELECT * FROM prices WHERE site_id = 1");
    socket.emit("GameSatisData", resGms.rows);

    //Sunucu isimleri çekiliyor.
    const sunucuID = await pool.query("SELECT prices.server_id, servers.name FROM prices JOIN servers ON prices.server_id = servers.server_id WHERE site_id = 1 ORDER BY servers.server_id ASC ;")
    socket.emit("serverNames", sunucuID.rows);


    //Bu bölümde KlasGame'den gelen fiyat ve server isimleri yakalanıyor ve veri tabanında güncelleniyor.

    socket.on("klasGamePrices", async (data) => {
            for (let i = 0; i < data.length; i++) {
                const queryText = `UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 2)`;
                const values = [data[i].klasGameBuy, data[i].klasGameSell, data[i].klasGameName];
                try {
                    const res = await pool.query(queryText, values);
                } catch (err) {
                    console.log(err.stack);
                }
            }
    });
    const resKg = await pool.query("SELECT * FROM prices WHERE site_id = 2 ORDER BY server_id ASC");
    socket.emit("KlasGameData", resKg.rows);

    socket.on("oyunEksPrice", async (data) => {
        console.log(data)
        for (let i = 0; i < data.length; i++) {
            const queryText = `UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 3)`;
            const values = [data[i].oyunEksBuy, data[i].oyunEkSell, data[i].oyunEksName];
            try {
                const res = await pool.query(queryText, values);
                console.log(values)
            } catch (err) {
                console.log(err.stack);
            }
        }
    });

    const resOe = await pool.query("SELECT * FROM prices WHERE site_id = 3 ORDER BY server_id ASC");
    socket.emit("oyunEksData", resOe.rows);


    socket.on("vatanGamePrices", async (data) => {
        for (let i = 0; i < data.length; i++) {
            const queryText = `UPDATE prices SET buy_price = $1, sell_price =$2 WHERE server_id= (SELECT server_id FROM servers WHERE name = $3) AND (site_id= 4)`;
            const values = [data[i].vatanGameBuyPriceClean, data[i].vatanGameSellPriceClean, data[i].vatanGameName];
            try {
                const res = await pool.query(queryText, values);
            } catch (err) {
                console.log(err.stack);
            }
        }
    });

    const resVg = await pool.query("SELECT * FROM prices WHERE site_id = 4 ORDER BY server_id ASC");
    socket.emit("vatanGameData", resVg.rows);

});



server.listen(3000)