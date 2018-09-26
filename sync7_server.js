
var sync7 = require('./sync7.js')
console.log('sync7 version ' + sync7.version)

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
var port = sync7.port
web_server.listen(port)
console.log('openning ' + server_type + ' server on port ' + port)
var WebSocket = require('ws')
var wss = new WebSocket.Server({ server : web_server })

sync7.create_server({
    wss : wss
})
