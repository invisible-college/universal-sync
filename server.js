
console.log('version 1008')

var diff_lib = require('./diff_lib.js')

var uid = ('U' + Math.random()).replace(/\./, '')

var channel_version = {}
var people = {}

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

    var pid = ('U' + Math.random()).replace(/\./, '')
    console.log('openning pid:' + pid)

    var channel = null
    var Z = null
    people[pid] = {}
    people[pid].ws = ws

    ws.on('close', function () {
        console.log('closeing pid: ' + pid)
        delete people[pid]
    })

    ws.on('message', function incoming(message) {
        console.log('message: ' + message)

        var o = JSON.parse(message)
        if (o.channel) join_channel(o.channel)
        if (o.versions) merge(o.versions)
        if (o.range) on_range(o.range)
    })

    function try_send(ws, pid, msg) {
        try {
            ws.send(msg)
        } catch (e) {
            console.log('error sending to pid:' + pid + ', goodbye')
            delete people[pid]
        }
    }

    function join_channel(c) {
        channel = c
        Z = diff_lib.create_diffsyncZX2()

        people[pid].channel = channel
        people[pid].Z = Z

        diff_lib.diffsyncZX2_commit(Z, channel_version[channel] || '', uid)
        try_send(ws, pid, JSON.stringify({ versions : Z.versions }))
    }

    function merge(new_vs) {
        if (!new_vs) return;
        diff_lib.diffsyncZX2_merge(Z, new_vs, uid)
        channel_version[channel] = Z.parents_text
        each(people, function (p, k) {
            if (p.channel == channel && k != pid) {
                var c = diff_lib.diffsyncZX2_commit(p.Z, channel_version[channel], uid)
                if (c) {
                    try_send(p.ws, k, JSON.stringify({ versions : c }))
                }
            }
        })
    }

    function on_range(r) {
        each(people, function (p, k) {
            if (p.channel == channel && k != pid) {
                try_send(p.ws, k, JSON.stringify({ range : r }))
            }
        })
    }
})
