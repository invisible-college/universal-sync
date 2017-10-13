
console.log('version 1020')

var diffsync = require('./diffsync.js')
var bus = require('statebus')()
bus.sqlite_store()

var channel_versions = {}
var users = {}

for (var key in bus.cache) {
    if (!bus.cache.hasOwnProperty(key)) { continue }
    var o = bus.cache[key]
    if (key.startsWith('channel_versions/')) {

        if (o.value) {
            var m = key.match(/channel_versions\/(.*)/)
            channel_versions[m[1]] = o.value
            continue
        }

        channel_versions[o.name] = o.text
    }
    if (key.startsWith('users/')) {

        if (o.syncpair.versions) {
            var m = key.match(/users\/(.*)/)
            users[m[1]] = o
            continue
        }

        var u = users[o.id]
        if (!u) u = users[o.id] = {}
        u.id = o.id
        u.channel = o.channel
        if (!u.syncpair) u.syncpair = { versions : {} }
        u.syncpair.parents = o.syncpair.parents
        u.syncpair.parents_text = o.syncpair.parents_text
        u.syncpair.author = o.syncpair.author
        u.syncpair.next_commit = o.syncpair.next_commit
    }
    if (key.startsWith('/users_versions')) {
        var u = users[o.uid]
        if (!u) u = users[o.uid] = {}
        if (!u.syncpair) u.syncpair = { versions : {} }
        u.syncpair.versions[o.id] = {
            parents : o.parents,
            diff : o.diff
        }
    }
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
            var u = users[uid]
            if (!u) {
                u = {}
                u.id = uid
                u.channel = o.join.channel
                u.syncpair = diffsync.create_syncpair('s')
                var x = channel_versions[u.channel]
                diffsync.syncpair_commit(u.syncpair, (x && x.value) || '')
            }
            sockets[uid] = ws
            try {
                ws.send(JSON.stringify({ versions : diffsync.syncpair_my_newish_commits(u.syncpair), welcome : true }))
            } catch (e) {}
            save_user(u)
        }
        if (o.versions) merge(o.versions)
        if (o.range) on_range(o.range)
        if (o.ping) {
            try {
                ws.send(JSON.stringify({ pong : true }))
            } catch (e) {}
        }
        if (o.close) {
            var u = users[uid]
            delete users[uid]
            bus.delete('users/' + u.id)
            for (var k in u.syncpair.versions) {
                if (!u.syncpair.versions.hasOwnProperty(k)) { continue }
                bus.delete('users_versions/' + u.id + '/' + k)
            }
        }
    })
    ws.on('close', () => {
        delete sockets[uid]
    })

    function save_user(u) {
        bus.save({
            key : 'users/' + u.id,
            id : u.id,
            channel : u.channel,
            syncpair : {
                parents : u.syncpair.parents,
                parents_text : u.syncpair.parents_text,
                author : u.syncpair.author,
                next_commit : u.syncpair.next_commit
            }
        })
    }

    function save_versions(u, vs) {
        for (var k in vs) {
            if (!vs.hasOwnProperty(k)) { continue }
            bus.save({
                key : 'users_versions/' + u.id + '/' + k,
                uid : u.id,
                id : k,
                parents : vs[k].parents,
                diff : vs[k].diff
            })
        }
    }

    function merge(new_vs) {
        if (!new_vs) return;
        if (!uid) return;
        var u = users[uid]

        diffsync.syncpair_merge(u.syncpair, new_vs)
        save_versions(u, new_vs)
        save_user(u)

        channel_versions[u.channel] = u.syncpair.parents_text
        bus.save({
            key : 'channel_versions/' + u.channel,
            name : u.channel,
            text : channel_versions[u.channel]
        })

        for (var k in users) {
            if (!users.hasOwnProperty(k)) { continue }
            var v = users[k]
            if (v.channel == u.channel && v.id != uid) {
                var c = diffsync.syncpair_commit(v.syncpair, channel_versions[u.channel])
                if (c) {
                    try {
                        sockets[v.id].send(JSON.stringify({ versions : c }))
                    } catch (e) {}
                    save_user(v)
                    save_versions(v, c)
                }
            }
        }
    }

    function on_range(r) {
        for (var k in users) {
            if (!users.hasOwnProperty(k)) { continue }
            var v = users[k]
            if (v.channel == users[uid].channel && v.id != uid) {
                try {
                    sockets[v.id].send(JSON.stringify({ range : r }))
                } catch (e) {}
            }
        }
    }
})
