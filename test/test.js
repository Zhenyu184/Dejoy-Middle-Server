var events = require('events')
const http = require("http");
const request = require('sync-request')
var getRawBody = require('raw-body')

body = {"events":[{"type":"pulse","timestamp":1661518751852,"source":{"vendorHwid":"dj11300111","count":19,"inputPortId":3,"offline":false}}]}

var res = request("POST", "http://www.bonjoy-btg.com:5000/api/Arcade/Webhook",{ //請求狀態
        headers: {
            'Content-Type': 'application/json'
        }, //放入標頭,    
        body: JSON.stringify(body), //放入內容
        timeout: 1000, //等待幾秒沒回應就不管
  });
console.log(JSON.stringify(res.getBody('utf8'))); //temp紀錄請求到的結果
