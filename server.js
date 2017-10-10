
var each = function (o, cb) {
  if (o instanceof Array) {
    for (var i = 0; i < o.length; i++) {
      if (cb(o[i], i, o) == false)
        return false
    }
  } else {
    for (var k in o) {
      if (o.hasOwnProperty(k)) {
        if (cb(o[k], k, o) == false)
          return false
      }
    }
  }
  return true
}

console.log('version 1014')

var diff_lib = require('./diff_lib.js')
var bus = require('statebus')(); bus.sqlite_store()

var db = {}
each(bus.cache, function(value, key){
    db[key]=value
})

var server_uid = ('U' + Math.random()).replace(/\./, '')

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
                db[key].Z = diff_lib.create_diffsyncZX2()
                var x = db['channel_versions/'+db[key].channel]
                diff_lib.diffsyncZX2_commit(db[key].Z, (x && x.value) || '', server_uid)
            }

            sockets[uid] = ws

            try {
                ws.send(JSON.stringify({ versions : diff_lib.diffsyncZX2_my_newish_commits(db[key].Z, server_uid), welcome : true }))
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
        diff_lib.diffsyncZX2_merge(db[user_key].Z, new_vs, server_uid)
        var key = 'channel_versions/'+db[user_key].channel
        db[key] = {key:key, value:db[user_key].Z.parents_text}
        each(db, function (v, k) {
            if (!k.startsWith('users/')){return}
            var u = v
            var id = u.id
            if (u.channel == db[user_key].channel && id != uid) {
                var c = diff_lib.diffsyncZX2_commit(u.Z, db[key].value, server_uid)
                if (c) {
                    try {
                        sockets[id].send(JSON.stringify({ versions : c }))
                    } catch (e) {}
                    bus.save(u)
                }
            }
        })
        bus.save(db[user_key])
        bus.save(db[key])
    }

    function on_range(r) {
        each(db, function (v, k) {
            if (!k.startsWith('users/')){return}
            var u = v
            var id = u.id
            if (u.channel == db['users/'+uid].channel && id != uid) {
                try {
                    sockets[id].send(JSON.stringify({ range : r }))
                } catch (e) {}
            }
        })
    }
})
