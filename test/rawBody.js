var getRawBody = require('raw-body')
var http = require('http')

const ip = "192.168.7.67";
const port = 3000;

var server = http.createServer(function (req, res) {
  
  getRawBody(req) 
    .then(function (buf) {
      res.statusCode = 200
      console.log("buf", buf.toString('utf8'))
      res.end(buf.length + ' bytes submitted')
    })
    .catch(function (err) {
      res.statusCode = 500
      res.end(err.message)
    })
  
  
})

server.listen(port, ip, () => {   
    console.log(`Server 開始監聽 http://${ip}:${port}`); 
});