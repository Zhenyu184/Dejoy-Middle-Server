const http = require("http");
const request = require('sync-request')
var getRawBody = require('raw-body')

//函式功能:輸入5個參數mothod(字串)、url(字串)、headers(字串), body(json/字串)、 timeOut(int)
//輸    出:成功json檔、失敗1
//headers, body空白填"{}"

module.exports = {

  syncRequest: function (mothod, url, headers, body, timeOut) {
    timeOut = 0; //預設
    let answer = {};
    const authorization = 'bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhbGZhbG9vcF9tZXJjaGFudF9hcGkiLCJtaWQiOiI2MTE5NTBlM2Q3NzdhMTMyNWRlNzVmMjQiLCJpYXQiOjE2MzM1MDcwNTIsInNlZWQiOiJ3YmJZZGlGNHJqZkZ3R2NoIn0.lqeoAPigDR4MqvHoAMRi1mJsjUWJOXFSNK8DVPsaoTFjF9w6fX4XqEh4tbX_zVLt8F8TlzvCSb_1dr50v8OH-w';

	  if(headers == "{}" || headers == "{ }" ){
		  headers = "{ 'content-type': 'application/json' }";
	  }

    //發出請求
    if(mothod == "GET"){
      try {
        //印出請求內容
        console.log(`[syncRequest.js] <-嘗試發出GET請求 Url=${url}`);

        //請求主體
        var res = request("GET", url,{ //請求狀態
          headers: JSON.stringify(headers), //放入標頭,    
          timeout: timeOut * 1000, //等待幾秒沒回應就不管
        });

      }catch (error) {       
        console.error("[syncRequest.js] !!這個裝置沒回應");       
        return 1;      
      }
    }else if(mothod == "POST"){
      
      try {
        //印出請求內容
        console.log(`[syncRequest.js] <-嘗試發出POST請求 Url=${url}`);
        console.log(`[syncRequest.js] body=${JSON.stringify(body)}`);

        //請求主體
        var res = request("POST", url,{ //請求狀態
          headers: {
            'Content-Type': 'application/json',
          }, //放入標頭,    
          body: JSON.stringify(body), //放入內容
          timeout: timeOut * 1000, //等待幾秒沒回應就不管
        });
      
      } catch (error) {
        console.error("[syncRequest.js] !!這個裝置沒回應");
        return 1; 
      }
    }

    //處理回傳結果
    try { //如果結果是json檔
      answer = JSON.parse(res.getBody('utf8')); //answer紀錄請求到的結果
    } catch (error) { //如果結果不是json檔
      
      try{//如果結果是string檔
        answer = JSON.stringify(res.getBody('utf8')); //answer紀錄請求到的結果
      } catch (error) {
        console.error("[syncRequest.js] !!回傳結果無法透過JSON.parse()或JSON.stringify()解碼，或ngrok連結失效");
        return 1;
      }
     
    }

    console.log("[syncRequest.js] 裝置請求成功");
    console.log("[syncRequest.js] ->回傳結果:",JSON.stringify(answer), "typeof=",typeof answer); 

    //轉成 JSON 格式回傳(因為後續還會改到)
    return answer; 
  }

};
