const http = require("http");
const fs = require("fs");
const request = require('sync-request')
var getRawBody = require('raw-body')

//引入其他文件
const id2Url = require('./services/id2Url.js');
const syncRequest = require('./services/syncRequest.js');

//全域變數
const ip = "163.13.133.185";
const port = 3000;
const backstageUrl = "http://www.bonjoy-btg.com:5000";
const authorization = 'bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhbGZhbG9vcF9tZXJjaGFudF9hcGkiLCJtaWQiOiI2MTE5NTBlM2Q3NzdhMTMyNWRlNzVmMjQiLCJpYXQiOjE2MzM1MDcwNTIsInNlZWQiOiJ3YmJZZGlGNHJqZkZ3R2NoIn0.lqeoAPigDR4MqvHoAMRi1mJsjUWJOXFSNK8DVPsaoTFjF9w6fX4XqEh4tbX_zVLt8F8TlzvCSb_1dr50v8OH-w';
let   timestamp; //時間戳

//回應public內容(html)------------------------
const sendResponse_web = (filename, statusCode, response) => {
  fs.readFile(`./public/${filename}`, (error, data) => { 
    if (error) { 
      response.statusCode = 500;
      response.setHeader("Content-Type", "text/plain");
      response.write("filename = " + filename + "\n");
      response.write("error = " + error + "\n");
      response.end("Sorry, internal error");
    } else {
      response.statusCode = statusCode;
      response.setHeader("Content-Type", "text/html");
      response.end(data);
    }
  });
};

//回應旗下的門市資訊------------------------
const sendResponse_places = (statusCode, response) => {

  var openJSON = fs.readFileSync(`./table/places.json`, 'utf8'); //取得店面資訊清單(server內部)
  let placesJSON = JSON.parse(openJSON);//解析
  var openJSON = fs.readFileSync(`./table/alfaloopPlaces.json`, 'utf8'); //取得後台能讀的模板
  let alfaloopJSON = JSON.parse(openJSON);//解析
  //console.log(JSON.stringify(placesJSON));
  //console.log(JSON.stringify(alfaloopJSON));

  //取代results的部分
  delete alfaloopJSON.results.places;
  alfaloopJSON.results = placesJSON;

  //code和message寫死
  alfaloopJSON.code = "Success";
  alfaloopJSON.message = "ok";

  //回覆到後台
  response.statusCode = statusCode;
  try {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(alfaloopJSON));
    console.log("[sendResponse_places] <-成功讀取並回覆");
  }catch (error) {
    console.log("[sendResponse_places] !失敗");
    //console.log(JSON.stringify(alfaloopJSON));
  }
};

//回應所有終端機狀態------------------------
const sendResponse_terminals = ( place_id, response) => {
  let temp = {"results":{}}; //暫存請求
  var counterFind = 0;    //計算Table中找到的模組
  var counterSuccess = 0; //計算成功請求的模組
  var counterError = 0;   //計算失敗請求的模組

  //為了相容於蜂鳥id
  if(place_id == "61e7bd175b16f15f943283f0"){
    place_id = 10
  }else if(place_id == "61195144d037f17673dc6fcd"){
    place_id = 11
  }else if(place_id == "600000000000000000000000"){
    place_id = 12
  }

  var openJSON = fs.readFileSync(`./table/places.json`, 'utf8'); //取得店面資訊清單
  let placesJSON = JSON.parse(openJSON);//解析
  var openJSON = fs.readFileSync(`./table/terminals/alfaloopTerminals.json`, 'utf8'); //取得後台能讀的模板
  let alfaloopJSON = JSON.parse(openJSON);//解析
  var openJSON = fs.readFileSync(`./table/terminals/${place_id}/terminals.json`, 'utf8'); //取得該地區所有機台
  let terminalsJSON = JSON.parse(openJSON);//解析

  //填寫基本資訊到模板
  for(let i in placesJSON.places){ //loop places的JSON檔 找到_id代表的地址
    if(placesJSON.places[i]._id == place_id){//i拿到地址id
      alfaloopJSON.results.place._id = placesJSON.places[i]._id;
      alfaloopJSON.results.place.title = placesJSON.places[i].title;
      alfaloopJSON.results.place.description = placesJSON.places[i].description;
      alfaloopJSON.results.place.address = placesJSON.places[i].address;
      alfaloopJSON.results.place.lineAtUrl = placesJSON.places[i].lineAtUrl;
      alfaloopJSON.results.place.servicePhone = placesJSON.places[i].servicePhone;
      alfaloopJSON.results.place.geolocation = placesJSON.places[i].geolocation;
    }
  }

  //逐一訪問所有機台中的模組(請求->驗證)
  if(terminalsJSON.devices.length == 0){ //如果機台陣列為空
    console.log("[sendResponse_terminals] !沒機台");

  }else{

    for(let i in terminalsJSON.devices){ //loop每一個機台
      if(terminalsJSON.devices[i].model.length == 0){ //如果機台安裝沒模組
        console.log("[sendResponse_terminals] !此機台沒模組");
        continue; //別浪費時間
      }

      for(let j in terminalsJSON.devices[i].model){ //loop每個機台內的模組
        counterFind++;
        
        //紀錄時間戳(更新會用到)
        const dateTime = Date.now();
        timestamp = Math.floor(dateTime);//取得時間戳

        //發出請求
        temp = syncRequest.syncRequest('GET',`${terminalsJSON.devices[i].model[j].url}/request/state?_id=${terminalsJSON.devices[i]._id + terminalsJSON.devices[i].model[j]._id}`, {}, {}, 1);
        if(typeof temp == 'number' || temp.code == "error"){ //遠端裝置沒找到
          
          //紀錄更新資訊
          terminalsJSON.devices[i].model[j].connection = false;//標記離線
          terminalsJSON.devices[i].model[j].updateTime = Number(timestamp);

          //將現有資料庫推出
          temp = {"results":{}}; //因為syncRequest.syncRequest失敗temp=1所以要重新賦值
          temp.results.vendorHwid = terminalsJSON.devices[i]._id + terminalsJSON.devices[i].model[j]._id;
          temp.results.description = terminalsJSON.devices[i].description + "-" + terminalsJSON.devices[i].model[j].description;
          temp.results.type = terminalsJSON.devices[i].model[j].type;
          temp.results.type = terminalsJSON.devices[i].model[j].type;
          temp.results.connection = terminalsJSON.devices[i].model[j].connection;
          temp.results.updateTime = terminalsJSON.devices[i].model[j].updateTime;
          
          //console.log("[sendResponse_terminals] 這個裝置沒回應 將現有資料庫推出");
          counterError++;
        
        }else if(temp.code == "Success" || temp.code == " Success " ){ //遠端裝置有找到
          temp.results.connection = true;//標記連線中
          temp.results.updateTime = Number(timestamp);//紀錄時間戳

          //紀錄更新資訊
          terminalsJSON.devices[i].model[j].connection = true;
          terminalsJSON.devices[i].model[j].updateTime = Number(timestamp);

          //console.log("[sendResponse_terminals] 裝置請求成功");
          counterSuccess++;
        }
        alfaloopJSON.results.place['devices'].push(temp.results); //將讀出的結果push進去alfaloopJSON的devices陣列
        
      }  
    }
  }

  //寫回更新資料
  fs.writeFile(`./table/terminals/${place_id}/terminals.json`, JSON.stringify(terminalsJSON, null, 2), function (err) {
    if (err){
      console.log('[sendResponse_terminals] 資料更新失敗');
    } else {
      console.log('[sendResponse_terminals] 資料更新成功');
    }
  })

  //回覆到後端
  //console.log("[sendResponse_terminals] 最終請求結果:\n",alfaloopJSON); 
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(alfaloopJSON));
  console.log("[sendResponse_terminals] 共找到模組:", counterFind, "  線上:", counterSuccess, "  離線:", counterError);

};

//要求投幣/補票----------------------------
const sendResponse_coin = (buffer, response) => {
  //取出buffer的資料
  buffer = buffer.toString('utf8');
  console.log("[sendResponse_coin] buffer = ",buffer);
  let bufferJSON = JSON.parse(buffer); //解析

  //宣告區
  let _id = bufferJSON.vendorHwid; //在智購系統中代表id
  let count = bufferJSON.count; //投多少
  let modelId = bufferJSON.vendorHwid.substr(8, 2); //模組類型
  let mode = bufferJSON.mode; //哪個裝置
  let temp; //暫存剛收到的資料
  let poatBody = { //發出的請求
    "_id":_id,
    "count": count
  }
  let answer = { //回覆的訊號
    "code": "Fail",
    "message": "",
    "results": {
        "ack": 1
    } 
  }

  //根據id找url
  let url = id2Url.id2Url(_id);
  if(typeof url == 'number'){ //沒找到
    answer.message = "輸入的id沒找到url";
    response.setHeader("Content-Type", "application/json");   
    response.end(JSON.stringify(answer));//回覆後端失敗
  }

  //發出請求
  console.log('[sendResponse_coin] ?嘗試:',`${url}/request/gameMachine/pulse`);
  console.log('[sendResponse_coin] #發送body:',poatBody);
  try {
    var res = request('POST',`${url}/request/gameMachine/pulse`,{ //請求狀態
      headers: { 'content-type': 'application/json' },    
      body: JSON.stringify(poatBody), //放入內容
    });
    temp = JSON.parse(res.getBody('utf8')); //temp紀錄請求到的結果
    console.log("[sendResponse_coin] #回傳結果:\n",JSON.stringify(temp)); 
    console.error("[sendResponse_coin] √裝置請求成功");
  } catch (error) {
    console.error("[sendResponse_coin] !這個裝置沒回應");
  }

  //回覆到後端
  response.setHeader("Content-Type", "application/json");   
  response.end(JSON.stringify(answer));
  console.log("[sendResponse_coin] #最終請求結果:",JSON.stringify(answer));
  console.log("[sendResponse_coin] √完成請求");
};

//要求開機/關機----------------------
const sendResponse_power = (buffer, response) => {
  //取出buffer的資料
  buffer = buffer.toString('utf8');
  console.log("buffer = ",buffer);
  let bufferJSON = JSON.parse(buffer);//解析

  //宣告區
  let _id = bufferJSON.vendorHwid;//在智購系統中代表id
  let position = bufferJSON.position;//開或關
  let isFind = false;
  let answer = { //回覆的訊號
    "code": "Fail",
    "message": "",
    "results": {
    }
  }

  //根據id找url
  let url = id2Url.id2Url(_id);
  if(typeof url == 'number'){ //沒找到
    answer.message = "輸入的id沒找到url";
    response.setHeader("Content-Type", "application/json");   
    response.end(JSON.stringify(answer));//回覆後端失敗
  }

  //發出請求
  console.log('?嘗試:',`${url}/request/gameMachine/pulse`);
  answer = syncRequest.syncRequest('GET',`${url}/request/power?_id=${_id}&position=${position}`, {}, {}, 1.5);
  
  //回覆到後端
  if(typeof answer == 'number'){ //沒回應
    answer.code = "Fail"
    answer.message = "輸入的id沒找到url";
    response.setHeader("Content-Type", "application/json");   
    response.end(JSON.stringify(answer));//回覆後端失敗
  }else{
    answer.code = "Success"
    answer.message = "ok";
    //console.log("最終請求結果:\n",templateJSON);   
    response.setHeader("Content-Type", "application/json");   
    response.end(JSON.stringify(answer));   
    console.log("完成請求");
  }
};

//webhook投幣/出票-------------------
const sendResponse_webhook = (buffer, response) => {
  console.log("[sendResponse_webhook] --執行webhook投幣/出票觸發");
  let sendToBackground = false;

  //解析buffer中的資訊
  buffer = buffer.toString('utf8');
  let bufferJSON = JSON.parse(buffer);//解析
  console.log("[sendResponse_webhook] buffer=", JSON.stringify(bufferJSON)); //印出buffer中的資訊
  let _events = bufferJSON.events[0];
  let type = _events.type;
  let timestamp = _events.timestamp;
  let _id = _events.source.vendorHwid;
  let count = _events.source.count;
  let inputPortId = _events.source.inputPortId;
  let offline = _events.source.offline;
  let headers = {            
    'content-type': 'application/json',
    'Authorization': authorization
  }

  var openJSON = fs.readFileSync(`./table/terminals/templateWebhook.json`, 'utf8'); //取得後端平台能讀的模板   
  let templateJSON = JSON.parse(openJSON);//解析

  //寫資料到模板
  templateJSON.events[0].timestamp = timestamp;
  templateJSON.events[0].source.vendorHwid = _id;
  templateJSON.events[0].source.count = count;
  templateJSON.events[0].source.inputPortId = inputPortId;
  templateJSON.events[0].source.offline = offline;

  //分析webhook種類
  if( type == "gameCoin" || type == "coinPulse"){
    console.log("[sendResponse_webhook] --判斷是 投幣訊號")
    sendToBackground = true;
    templateJSON.events[0].type = "pulse";
    templateJSON.events[0].source.inputPortId = 3; //投幣訊號是3
  }else if(type == "outLottery" || type == "lotteryPulse"){
    console.log("[sendResponse_webhook] --判斷是 出票訊號")
    sendToBackground = true;
    templateJSON.events[0].type = "pulse";
    templateJSON.events[0].source.inputPortId = 1; //出票訊號是1
  }else{
    console.log("[sendResponse_webhook] --不明訊號")
    sendToBackground = false;
  }

  //發送到後台(如果訊號正確)
  if(sendToBackground == true){
    console.log("[sendResponse_webhook] <-發送到後台",`${backstageUrl}/api/Arcade/Webhook`);  
    temp = syncRequest.syncRequest('POST', `${backstageUrl}/api/Arcade/Webhook`, {}, templateJSON, 1);
    //console.log(temp);
  }

  //回覆給前端    
  //console.log("最終請求結果:\n",templateJSON);      
  response.setHeader("Content-Type", "application/json");      
  response.end(JSON.stringify(templateJSON)); //後台資訊     
  console.log("[sendResponse_webhook] 結束");
  //console.log("送出結果 = ", JSON.stringify(templateJSON))
};

//透過ngrok更新Url-------------------
const sendResponse_updateUrl = (buffer, response) => {
  console.log(">更新URL觸發");
  let sendToBackground = false;

  //解析buffer中的資訊
  buffer = buffer.toString('utf8');
  let bufferJSON = JSON.parse(buffer);//解析
  //console.log("buffer=", JSON.stringify(bufferJSON));
  let _events = bufferJSON.events[0];
  let type = _events.type;
  let timestamp = _events.timestamp;
  let _id = _events.source.vendorHwid;
  let count = _events.source.count;
  let inputPortId = _events.source.inputPortId;
  let offline = _events.source.offline;
  let headers = {            
    'content-type': 'application/json',
    'Authorization': authorization
  }

  var openJSON = fs.readFileSync(`./table/terminals/templateWebhook.json`, 'utf8'); //取得後端平台能讀的模板   
  let templateJSON = JSON.parse(openJSON);//解析

  //寫資料到模板
  templateJSON.events[0].timestamp = timestamp;
  templateJSON.events[0].source.vendorHwid = _id;
  templateJSON.events[0].source.count = count;
  templateJSON.events[0].source.inputPortId = inputPortId;
  templateJSON.events[0].source.offline = offline;

  //分析webhook種類
  if( type == "gameCoin" || type == "coinPulse"){
    console.log("投幣訊號")
    sendToBackground = true;
    templateJSON.events[0].type = "pulse";
    templateJSON.events[0].source.inputPortId = 3; //投幣訊號是3
  }else if(type == "outLottery" || type == "lotteryPulse"){
    console.log("出票訊號")
    sendToBackground = true;
    templateJSON.events[0].type = "pulse";
    templateJSON.events[0].source.inputPortId = 1; //出票訊號是1
  }else{
    console.log("不明訊號")
    sendToBackground = false;
  }

  //發送到後台(如果訊號正確)
  if(sendToBackground == true){
    console.log("POST要求",`${backstageUrl}/api/Arcade/Webhook`);  
    temp = syncRequest.syncRequest('POST', `${backstageUrl}/api/Arcade/Webhook`, headers, templateJSON, 1);
  }

  //回覆給前端    
  //console.log("最終請求結果:\n",templateJSON);      
  response.setHeader("Content-Type", "application/json");      
  response.end(JSON.stringify(templateJSON)); //後台資訊     
  console.log("完成請求");
  //console.log("送出結果 = ", JSON.stringify(templateJSON))
};

//建置服務(名稱server)(要求->回應)------------------------
const server = http.createServer((request, response) => {
  const method = request.method;
  let url = request.url;

  //取得訪問url
  const requestUrl = new URL(url, `http://${ip}:${port}`);
  url = requestUrl.pathname;
  
  //解析攜帶參數
  const lang = requestUrl.searchParams.get("lang");
  const place_id = requestUrl.searchParams.get("place");
  const vendorHwid = requestUrl.searchParams.get("vendorHwid");
  const count = requestUrl.searchParams.get("count");
  const mode = requestUrl.searchParams.get("mode");
  const position = requestUrl.searchParams.get("position");
  const M_Type = requestUrl.searchParams.get("M_Type");
  const M_id = requestUrl.searchParams.get("M_id");
  //requestUrl = null; //釋放記憶體(拿來解析參數與路徑就沒用了)

  //接受"GET"method(方法)
  if (method === "GET") {

    if ( url === "/" ) { //首頁(index.html)
      console.log(`[server] ->接受GET要求 req = http://${ip}:${port}${url} (顯示首頁)`);
      sendResponse_web(`index.html`, 200, response); 

    } else if ( url === "/index.html" ){
      console.log(`[server] ->接受GET要求 req = http://${ip}:${port}${url} (顯示首頁)`);
      sendResponse_web(`index.html`, 200, response);

    } else if ( url === "/dejoy/places") { //查詢旗下門市資訊    
      console.log(`[server] ->接受GET要求 req = http://${ip}:${port}${url} (查詢旗下門市資訊)`);    
      sendResponse_places(200, response);

    } else if ( url === "/dejoy/places/terminals") { //查詢指定門市所有終端機
      console.log(`[server] ->接受GET要求 req = http://${ip}:${port}${url}?place=${place_id} (查詢指定門市所有終端機)`);
      sendResponse_terminals(place_id, response); //帶place參數指出訪問地點   

    } else { //404頁面
      console.log(`[server] ->接受GET要求 要求無法處理返回404`);
      sendResponse_web(`404.html`, 404, response);
    }
  }

  if (method === "POST"){

    if (url === "/dejoy/places/terminals/request/game/coin") { //要求遠端投幣/出票       
      console.log(`[server] ->接受POST要求 req = http://${ip}:${port}${url} (要求遠端投幣/出票)`);
      
      //解析攜帶Body/RAW(buffer)
      getRawBody(request) 
      .then(function (buf) {
        response.statusCode = 200;
        //處理要求
        sendResponse_coin(buf, response); 
      })
      .catch(function (err) {
        response.statusCode = 500;
        response.end(err.message);
      })

    } else if (url === "/dejoy/places/terminals/request/game/power") { //要求遠端開機/關機             
      console.log(`[server] ->接受POST要求 req  = http://${ip}:${port}${url} (要求遠端開機/關機)`);  
      
      //解析攜帶Body/RAW(buffer)
      getRawBody(request) 
      .then(function (buf) {
        response.statusCode = 200;
        //處理要求
        sendResponse_coin(buf, response); 
      })
      .catch(function (err) {
        response.statusCode = 500;
        response.end(err.message);
      })

    } else if (url === "/webhook") { //遠端投幣/出票的訊號
      console.log(`[server] ->接受POST要求 req  = http://${ip}:${port}${url} (遠端投幣/出票的訊號)`); 

      //解析攜帶Body/RAW(buffer)
      getRawBody(request) 
      .then(function (buf) {
        response.statusCode = 200;
        //處理要求
        sendResponse_webhook(buf, response); 
      })
      .catch(function (err) {
        response.statusCode = 500;
        response.end(err.message);
      })

    } else if (url === "/updateUrl") { //更新Url
      console.log(`[server] ->接受POST要求 req  = http://${ip}:${port}${url} (遠端投幣/出票的訊號)`); 
    
      //解析攜帶Body/RAW(buffer)
      getRawBody(request) 
      .then(function (buf) {
        response.statusCode = 200;
        //處理要求
        sendResponse_updateUrl(buf, response); 
      })
      .catch(function (err) {
        response.statusCode = 500;
        response.end(err.message);
      })
    
    } else { //404頁面       
      console.log(`[server] ->接受POST要求 要求無法處理返回404`); 
      sendResponse_web(`404${language}.html`, 404, response);     
    }
  }
});

//Run Server 要求監聽ip及port
server.listen(port, ip, () => {
  
  //顯示logo資訊
  fs.readFile(__dirname + "/services/logo.txt", (error, data) => {
    if(error) {
        throw error;
    }
    console.log(data.toString());
    console.log(`[server.listen] 開始監聽 http://${ip}:${port}`);
  });

});
