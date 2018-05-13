import Koa from 'koa'
import socket from 'socket.io'
import http from 'http'
import serve from 'koa-static'

const app = new Koa()

// Basic.
app.use(serve('public/'))

const server = http.createServer(app.callback())
const io = socket(server)

io.on('connection', function(socket){
    console.log('a user connected')
    socket.on('disconnect', function(){
        console.log('user disconnected');
      });
    socket.on('chat message', function(msg){
        io.emit('chat message', msg);
    });
})

server.listen(3000)

console.log(`Server listening on ${process.env.PORT || 3000}`)