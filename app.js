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
        for (let i = 0; i < data.length; i++) {
            const queryText2 = `UPDATE servers SET name = $1 WHERE server_id = $2`;
            const values = [data[i].name, i + 1];
            try {
                const res = await pool.query(queryText2, values);
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
    const sunucuID = await pool.query("SELECT prices.server_id, servers.name FROM prices JOIN servers ON prices.server_id = servers.server_id WHERE site_id = 1 ;")
    socket.emit("serverNames", sunucuID.rows);


// ID SORUNSALI, VERİTABANINA FARKLI ID İLE KAYIT EDİYOR ID'LERİ EŞLEŞTİRMEK LAZIM

    socket.on("klasGamePrices", async (data) => {
            for (let i = 0; i < data.length; i++) {
                const queryText = `UPDATE prices SET buy_price = $1, sell_price = $2 WHERE server_id = $3 AND (site_id= 2)`;
                const values = [data[i].klasGameBuy, data[i].klasGameSell, i + 1];
                try {
                    const res = await pool.query(queryText, values);
                } catch (err) {
                    console.log(err.stack);
                }
            }
    });


    const resKg = await pool.query("SELECT * FROM prices WHERE site_id = 2");
    socket.emit("KlasGameData", resKg.rows, result);

});



server.listen(3000)