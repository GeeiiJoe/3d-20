import Koa from 'koa'
import socket from 'socket.io'
import http from 'http'
import serve from 'koa-static'
import * as cv from 'opencv4nodejs'
import AR from 'js-aruco'
import Canvas from 'canvas'
import { HAAR_FRONTALCATFACE_EXTENDED } from 'opencv4nodejs';

const app = new Koa()

// Basic.
app.use(serve('public/'))

const server = http.createServer(app.callback())
const io = socket(server)

let vCap = null
const devicePort = 0

io.on('connection', function(socket){
    console.log('a user connected')
    socket.on('disconnect', () => {
        console.log('user disconnected');
      });
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    socket.on('calibrate', () => {
        // open capture from webcam
        if (!vCap) vCap = new cv.VideoCapture(devicePort);

        vCap.set(cv.CV_CAP_PROP_FRAME_WIDTH, '960')
        vCap.set(cv.CV_CAP_PROP_FRAME_HEIGHT, '1280')
        // loop through the capture
        const delay = 10;
        let done = false;
        const intvl = setInterval(() => {
            let frame = vCap.read();
            // loop back to start on end of stream reached
            if (frame.empty) {
                vCap.reset();
                frame = vCap.read();
            }
            if (frame) {
                const corners = frame.findChessboardCorners(new cv.Size(12,12))
                if (corners.corners.length > 0) {
                    io.emit('calibration', corners.corners)
                    done = true
                }
            }

            if (done) {
                clearInterval(intvl)
                vCap.release()
            }
        }, delay);
    })

    socket.on('scan', () => {
        if (!vCap) vCap = new cv.VideoCapture(devicePort);

        // loop through the capture
        const delay = 10;
        let done = false;
        const intvl = setInterval(() => {
            let frame = vCap.read();
            // loop back to start on end of stream reached
            
            if (frame.empty) {
                try{
                    vCap.reset();
                } catch (e) {
                    vCap = new cv.VideoCapture(devicePort);
                }
                frame = vCap.read();
            }

            if (frame) {
                // see if we can detect any aruco markers
                const canvas = new Canvas(frame.cols, frame.rows)
                const ctx = canvas.getContext('2d')

                // convert your image to rgba color space
                const matRGBA = frame.channels === 1
                ? frame.cvtColor(cv.COLOR_GRAY2RGBA)
                : frame.cvtColor(cv.COLOR_BGR2RGBA);

                //console.log(frame)
                // create new ImageData from raw mat data
                const imgData = new Canvas.ImageData(
                    new Uint8ClampedArray(matRGBA.getData()),
                        frame.cols,
                        frame.rows
                );

                // build an aruco detector
                const detector = new AR.AR.Detector();
                const markers = detector.detect(imgData)
                if (markers.length > 0)  {
                    io.emit('tile-movement', markers)
                }
            }

            if (done) {
                clearInterval(intvl)
                vCap.release()
                vCap.reset()
            }
        }, delay);
    })
})

server.listen(3000, (err) => {
    if (err) console.error(err)
    else console.log(`Server listening on ${process.env.PORT || 3000}`) 
    if (!vCap) vCap = new cv.VideoCapture(devicePort);
});