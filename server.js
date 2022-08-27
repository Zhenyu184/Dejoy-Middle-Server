const http = require("http");
const fs = require("fs");
const request = require('request')
const express = require('express')
const app = express()

const ip = "192.168.7.67";
const port = 3000;

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

//回應json靜態內容------------------------
const sendResponse_json = (filename, statusCode, response) => {
  fs.readFile(`./json/${filename}`, (error, data) => { 
    if (error) { 
      response.statusCode = 500;
      response.setHeader("Content-Type", "application/json");
      response.write("filename = " + filename + "\n");
      response.write("error = " + error + "\n");
      response.end("Sorry, internal error");
    } else {
      response.statusCode = statusCode;
      response.setHeader("Content-Type", "application/json");
      response.end(data);
    }
  });
};

//回應所有終端機狀態------------------------
const sendResponse_terminals = ( url, place_id, response) => {
  
  var openJSON = fs.readFileSync(`./config/terminals/terminalType.json`, 'utf8');
  let typeJSON = JSON.parse(openJSON);//解析

  for(let i in typeJSON1.type){ //loop機台類型
    
    console.log("發出請求:",`./config/terminals/${place_id}/${typeJSON.type[i]}/terminals.json` )
    var openJSON = fs.readFileSync(`./config/terminals/${place_id}/${typeJSON.type[i]}/terminals.json`, 'utf8');
    let terminalJSON = JSON.parse(openJSON);//解析
    let data;
    var drivces = {"devices": []};

    for(let j in terminalJSON.devices){ //loop機台陣列
      //如果陣列為空就結束本次迴圈
      if(terminalJSON.devices.length == 0){
        continue;
      }

      //發出要求對每個裝置發出要求
      request.get("http://" + terminalJSON.devices[j]._ip + ":" + terminalJSON.devices[j]._port + url, (error, response, body) => {

        try {
          //如果成功就解析
          data = JSON.parse(body);
        } catch (err) {
          // 如果失敗就顯示API抓取錯誤並跳出
          console.log('API抓取錯誤', error);
          return;
        }
          //將讀出的結果push進去drivces{ }
          //console.log(data.results);
          drivces['devices'].push(data.results);
          console.log("drivces in call back = ", drivces);
          response.send(drivces);
      });
      //console.log("drivces out call back = ", drivces);
      
    }
  }
  console.log("123response = ",response);

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
  const M_Type = requestUrl.searchParams.get("M_Type");
  const M_id = requestUrl.searchParams.get("M_id");
  let language, MachineType = M_Type , Machine_id = M_id; 
  //requestUrl = null; //釋放記憶體(拿來解析參數與路徑就沒用了)

    //接受"GET"method(方法)
  if (method === "GET") {

    if (url === "/") { //首頁(index.html)
      console.log(`>接受要求 req = http://${ip}:${port}${url} (顯示首頁)`);
      sendResponse_web(`index${language}.html`, 200, response); 

    } else if (url === "/about.html") { //關於頁面(about.html)
      console.log(`>接受要求 req = http://${ip}:${port}${url} (顯示資訊頁面)`);
      sendResponse_web(`about${language}.html`, 200, response); 

    } else if (url === "/dejoy/places") { //查詢旗下門市資訊    
      console.log(`>接受要求 req = http://${ip}:${port}${url} (查詢旗下門市資訊)`);    
      sendResponse_json(`places/places.json`, 200, response);

    } else if (url === "/dejoy/places/terminals") { //查詢指定門市所有終端機
      console.log(`>接受要求 req = http://${ip}:${port}${url} (查詢指定門市所有終端機)`);
      sendResponse_terminals(`/request/state`, place_id, response);//帶place參數指出訪問地點

    } else if (url === "/dejoy/terminals/state") { //遠端要求投幣/退幣      
      sendResponse_json(`/terminals/${MachineType}/${Machine_id}/remote-state.json`, 200, response);

    } else if (url === "/dejoy/terminals/state") { //遠端要求開機/關機             
      sendResponse_json(`/terminals/${MachineType}/${Machine_id}/remote-state.json`, 200, response);

    } else { //404頁面
      sendResponse_web(`404${language}.html`, 404, response);
    }

    //接受"POST"method(方法)  
  } else if (method === "POST") {

    if(url === "/dejoy/terminals/coin"){ //遠端要求投幣/退幣
      sendResponse_json(`/terminals/${MachineType}/${Machine_id}/remote-coin.json`, 200, response);
    }else if (url === "/dejoy/terminals/power") { //遠端要求開機/關機
      sendResponse_json(`/terminals/${MachineType}/${Machine_id}/remote-power.json`, 200, response);
    }else { //404頁面
      sendResponse_web(`404${language}.html`, 404, response);
    }
  }
});

//Run Server 要求監聽ip及port
server.listen(port, ip, () => {
  console.log(`Server 開始監聽 http://${ip}:${port}`);
});
