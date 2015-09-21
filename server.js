var http = require('http');
var socketio = require('socket.io');

function getIPAddress() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];

        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                return alias.address;
        }
    }

    return '0.0.0.0';
}

var port = process.env.OPENSHIFT_NODEJS_PORT || 3000
var ip_address = process.env.OPENSHIFT_NODEJS_IP || getIPAddress()

var server = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<h1>Server is running...</h1>');
});

//server.listen(port);
server.listen(port, ip_address, function () {
    console.log("Listening on " + ip_address + ", port " + port)
});
var io = socketio.listen(server);


var users = {};
io.sockets.on('connection', function (socket) {
    socket.on('checkUsername', function (user) {
        var exist = false;
        for (var i in users) {
            users[i].username === user.username ? exist = true : 0;
        }
        socket.emit('checkUsername', exist, user);
    });
    socket.on('online', function (user) {
        socket.user = user;
        users[user.id] = user;
        io.sockets.sockets[user.id] = socket.id;
        socket.emit('allUsersOnline', users);
        socket.broadcast.emit('newUserOnline', user);
    });
    socket.on('privateMessage', function (dataMessage) {
        if (socket.user) {
            var sock_id = io.sockets.sockets[dataMessage.userId];
            var data = {
                msg: dataMessage.msg,
                date: dataMessage.date,
                newDate: dataMessage.newDate,
                user: socket.user
            };
            socket.to(sock_id).emit("privateMessage", data);
        } else {
            socket.emit('offlinebyinnactive');
        }
    });
    socket.on('typing', function (data) {
        if (socket.user) {
            var sock_id = io.sockets.sockets[data.userId];
            var data = {
                userId: socket.user.id
            };
            socket.to(sock_id).emit('typing', data);
        }
    });
    socket.on('viewed', function (id) {
        if (socket.user) {
            var sock_id = io.sockets.sockets[id];
            var data = {
                userId: socket.user.id
            };
            socket.to(sock_id).emit('viewed', data);
        }
    });
    socket.on('disconnect', function () {
        if (socket.user !== undefined) {
            socket.broadcast.emit('offline', socket.user);
            delete users[socket.user.id];
        }
    });
});



//console.log('Server running at port: ' + port);