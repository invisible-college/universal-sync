
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

console.log('version 1013')

var diff_lib = require('./diff_lib.js')

var server_uid = ('U' + Math.random()).replace(/\./, '')

var channel_versions = {}
var users = {}

var fs = require('fs')
var web_server = null
if (fs.existsSync('privkey.pem') && fs.existsSync('fullchain.pem')) {
    web_server = require('https').createServer({
        key : fs.readFileSync('privkey.pem'),
        cert : fs.readFileSync('fullchain.pem')
    })
} else {
    web_server = require('http').createServer()
}
web_server.listen(60606)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server : web_server });
wss.on('connection', function connection(ws) {
    console.log('new connection')

    var uid = null

    ws.on('message', function incoming(message) {
        console.log('message: ' + message)

        var o = JSON.parse(message)
        if (o.join) {
            uid = o.join.uid
            if (!users[uid]) {
                users[uid] = {}
                users[uid].channel = o.join.channel
                users[uid].Z = diff_lib.create_diffsyncZX2()
                diff_lib.diffsyncZX2_commit(users[uid].Z, channel_versions[users[uid].channel] || '', server_uid)
            }
            users[uid].ws = ws

            try {
                ws.send(JSON.stringify({ versions : diff_lib.diffsyncZX2_my_newish_commits(users[uid].Z, server_uid), welcome : true }))
            } catch (e) {}
        }
        if (o.versions) merge(o.versions)
        if (o.range) on_range(o.range)
        if (o.ping) {
            try {
                ws.send(JSON.stringify({ pong : true }))
            } catch (e) {}
        }
        if (o.close) {
            delete users[uid]
        }
    })

    function merge(new_vs) {
        if (!new_vs) return;
        if (!uid) return;
        diff_lib.diffsyncZX2_merge(users[uid].Z, new_vs, server_uid)
        channel_versions[users[uid].channel] = users[uid].Z.parents_text
        each(users, function (u, id) {
            if (u.channel == users[uid].channel && id != uid) {
                var c = diff_lib.diffsyncZX2_commit(u.Z, channel_versions[users[uid].channel], server_uid)
                if (c) {
                    try {
                        u.ws.send(JSON.stringify({ versions : c }))
                    } catch (e) {}
                }
            }
        })
    }

    function on_range(r) {
        each(users, function (u, id) {
            if (u.channel == users[uid].channel && id != uid) {
                try {
                    u.ws.send(JSON.stringify({ range : r }))
                } catch (e) {}
            }
        })
    }
})
