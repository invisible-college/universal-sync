
console.log('version 1020')

var diffsync = require('./diffsync.js')
var bus = require('statebus')()
bus.sqlite_store()

var db = {}
for (var key in bus.cache) {
    if (!bus.cache.hasOwnProperty(key)) { continue }
    db[key] = bus.cache[key]
}

var fs = require('fs')
var web_server = null
if (fs.existsSync('privkey.pem') && fs.existsSync('fullchain.pem')) {
    web_server = require('https').createServer({
        key : fs.readFileSync('privkey.pem'),
        cert : fs.readFileSync('fullchain.pem')
    })
    console.log('openning https server..')
} else {
    web_server = require('http').createServer()
    console.log('openning http server..')
}
var port = 60606
web_server.listen(port)
console.log('..on port ' + port)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server : web_server });
const sockets = {}
wss.on('connection', function connection(ws) {
    console.log('new connection')

    var uid = null

    ws.on('message', function incoming(message) {
        console.log('message: ' + message)

        var o = JSON.parse(message)
        if (o.join) {
            uid = o.join.uid
            var key = 'users/'+uid
            if (!db[key]) {
                db[key] = {}
                db[key].channel = o.join.channel
                db[key].id = uid
                db[key].key = key
                db[key].syncpair = diffsync.create_syncpair('s')
                var x = db['channel_versions/'+db[key].channel]
                diffsync.syncpair_commit(db[key].syncpair, (x && x.value) || '')
            }

            sockets[uid] = ws

            try {
                ws.send(JSON.stringify({ versions : diffsync.syncpair_my_newish_commits(db[key].syncpair), welcome : true }))
            } catch (e) {}
            bus.save(db[key])
        }
        if (o.versions) merge(o.versions)
        if (o.range) on_range(o.range)
        if (o.ping) {
            try {
                ws.send(JSON.stringify({ pong : true }))
            } catch (e) {}
        }
        if (o.close) {
            var key = 'users/'+uid
            bus.delete(key)
        }
    })
    ws.on('close', () => {
        delete sockets[uid]
    })
    function merge(new_vs) {
        if (!new_vs) return;
        if (!uid) return;
        var user_key = 'users/'+uid
        diffsync.syncpair_merge(db[user_key].syncpair, new_vs)
        var key = 'channel_versions/'+db[user_key].channel
        db[key] = {key:key, value:db[user_key].syncpair.parents_text}
        for (var k in db) {
            if (!db.hasOwnProperty(k)) { continue }
            if (!k.startsWith('users/')) { continue }
            var v = db[k]
            if (v.channel == db[user_key].channel && v.id != uid) {
                var c = diffsync.syncpair_commit(v.syncpair, db[key].value)
                if (c) {
                    try {
                        sockets[v.id].send(JSON.stringify({ versions : c }))
                    } catch (e) {}

                    // work here

                    console.time('bus.save(v)')
                    bus.save(v)
                    console.timeEnd('bus.save(v)')
                }
            }
        }

        // work here
        console.time('bus.save(db[user_key])')
        bus.save(db[user_key])
        console.timeEnd('bus.save(db[user_key])')

        console.time('bus.save(db[key])')
        bus.save(db[key])
        console.timeEnd('bus.save(db[key])')
    }

    function on_range(r) {
        for (var k in db) {
            if (!db.hasOwnProperty(k)) { continue }
            if (!k.startsWith('users/')) { continue }
            var v = db[k]
            if (v.channel == db['users/' + uid].channel && v.id != uid) {
                try {
                    sockets[v.id].send(JSON.stringify({ range : r }))
                } catch (e) {}
            }
        }
    }
})
