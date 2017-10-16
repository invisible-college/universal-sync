
var diffsync = require('./diffsync.js')
console.log('diffsync version ' + diffsync.version)

var bus = require('statebus')()
bus.sqlite_store()

var channels = {}

each(bus.cache, function (o, key) {
    if (key.startsWith('commit/')) {
        if (!channels[o.channel]) channels[o.channel] = {
            name : o.channel,
            minigit : diffsync.minigit_create(),
            members : []
        }
        var mg = channels[o.channel].minigit
        if (!mg.commits[o.id]) mg.commits[o.id] = { children : {} }
        if (o.text) mg.commits[o.id].text = o.text
        mg.commits[o.id].parents = o.parents
        each(o.from_parents, function (d, p) {
            if (!mg.commits[p]) mg.commits[p] = { children : {} }
            mg.commits[p].children[o.id] = d
        })
    }
})
each(channels, function (c) {
    diffsync.minigit_merge(c.minigit, {})
})

var fs = require('fs')
var web_server = null
var server_type = null
if (fs.existsSync('privkey.pem') && fs.existsSync('fullchain.pem')) {
    web_server = require('https').createServer({
        key : fs.readFileSync('privkey.pem'),
        cert : fs.readFileSync('fullchain.pem')
    })
    server_type = 'https'
} else {
    web_server = require('http').createServer()
    server_type = 'http'
}
var port = 60606
web_server.listen(port)
console.log('openning ' + server_type + ' server on port ' + port)
var WebSocket = require('ws')
var wss = new WebSocket.Server({ server : web_server })

wss.on('connection', function connection(ws) {
    console.log('new connection')

    var channel = null
    ws.on('message', function incoming(message) {
        console.log('message: ' + message)

        var o = JSON.parse(message)
        if (!(o.v && o.v >= diffsync.version)) { return }
        if (o.join) {
            channel = channels[o.join.channel]
            if (!channel) channel = channels[o.join.channel] = {
                name : o.join.channel,
                minigit : diffsync.minigit_create(),
                members : []
            }
            channel.members.push(ws)
            try {
                ws.send(JSON.stringify({ commits : channel.minigit.commits, welcome : true }))
            } catch (e) {}
        }
        if (!channel) { return }
        if (o.commits) { merge(o.commits) }
        if (o.range) { send_to_all_but_me(JSON.stringify({ range : o.range })) }
        if (o.ping) {
            try {
                ws.send(JSON.stringify({ pong : true }))
            } catch (e) {}
        }
    })
    ws.on('close', () => {
        if (channel) {
            channel.members.splice(channel.members.indexOf(ws), 1)
        }
    })

    function send_to_all_but_me(message) {
        each(channel.members, function (them) {
            if (them != ws) {
                try {
                    them.send(message)
                } catch (e) {}
            }
        })
    }

    function merge(commits) {
        var new_commits = {}
        each(commits, function (c, id) {
            if (c.parents && !channel.minigit.commits[id]) {
                var o = {
                    key : 'commit/' + id,
                    id : id,
                    channel : channel.name,
                    parents : c.parents,
                    from_parents : {}
                }
                if (c.text && Object.keys(o.parents).length == 0) {
                    o.text = c.text
                }
                each(c.parents, function (_, pid) {
                    o.from_parents[pid] = commits[pid].children[id]
                })
                bus.save(o)

                new_commits[id] = c
                each(c.parents, function (p, pid) {
                    new_commits[pid] = commits[pid]
                })
            }
        })
        diffsync.minigit_merge(channel.minigit, commits)
        send_to_all_but_me(JSON.stringify({ commits : new_commits }))
    }
})

function each(o, cb) {
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
