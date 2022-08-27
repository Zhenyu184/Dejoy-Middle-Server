const fs = require("fs");

//函式功能:輸入id(字串)
//有找到的話輸出他的Url(字串)，沒找到的話輸出非0正整數
//會自動判斷8碼id(找裝置Url)或10碼id(找模組Url)
//如果沒有模組的Url則輸出裝置的Url
//錯誤1:輸入格式錯誤  錯誤2:公司前綴錯誤            錯誤3:places.json開啟錯誤 
//錯誤4:Place沒找到!  錯誤5:terminals.json開啟錯誤  錯誤6:url沒找到

module.exports = {

  //根據id找url
  id2Url: function (_id) {

    let isFindPlace = false; //有沒有找到的參數
    let isFindDevice = false; //有沒有找到的參數
    let placesJSON;
    let terminalsJSON;
    let url = "unknown"; //目標機台url
    var openJSON

    _id = _id.toString();//轉型
    const companyId = _id.substr(0, 2); //公司
    const placeId = _id.substr(2, 2); //地點
    const deviceType = _id.substr(4, 1); //機台類型
    const deviceId = _id.substr(5, 3); //機台編號
    let modelType = 0; //模組類型
    let modelId = 0; //模組編號

    if(_id.length == 8){
      //這是機台台號
    }else if(_id.length == 10){
      modelType = _id.substr(8, 1); //模組類型
      modelId = _id.substr(9, 1); //模組編號
    }else{
      console.log("[id2Url.js] 輸入格式錯誤",`id=${_id}`);
      return 1;
    }

    if(companyId == "dj"){
      //正確
    }else{
      console.log("[id2Url.js] 公司前綴錯誤",`company=${companyId}`);
      return 2;
    }

    try {
      //開啟id指向的店面清單
      openJSON = fs.readFileSync(`./table/places.json`, 'utf8');
      placesJSON = JSON.parse(openJSON);//解析
    } catch (error) {
      console.log("[id2Url.js] places.json開啟錯誤!");
      return 3;
    }  

    for(let i in placesJSON.places){ //loop 店面
      if( placesJSON.places[i]._id == placeId ){
        isFindPlace = true;
      }
    }

    if(isFindPlace){
      //正確
    }else{
      console.log("[id2Url.js] Place沒找到!",`Place=${placeId}`);
      return 4;
    }

    try {
      //開啟id指向的機台清單
      openJSON = fs.readFileSync(`./table/terminals/${placeId}/terminals.json`, 'utf8');
      terminalsJSON = JSON.parse(openJSON);//解析
    } catch (error) {
      console.log("[id2Url.js] terminals.json開啟錯誤!",`place=${placeId}`);
      return 5;
    }  

    for(let i in terminalsJSON.devices){ //loop 機台
      if(isFindDevice == true){ //如果以
        break;
      }
      if( terminalsJSON.devices[i]._id.substr(2, 6) == _id.substr(2, 6) ){//找到該機台

        if(_id.length == 8){
          url = terminalsJSON.devices[i].url; //取得機台url
          isFindDevice = true;
          break;
        }

        for(let j in terminalsJSON.devices[i].model){ //loop 模組
          
          if( terminalsJSON.devices[i].model[j]._id == _id.substr(8, 2) ){ //找到該模組
            
            //url方面devices有就用devices的url沒有就用model的url
            url = terminalsJSON.devices[i].model[j].url;
            if(terminalsJSON.devices[i].url !== ""){
              url = terminalsJSON.devices[i].url; //取得機台url
            }else{
              url = terminalsJSON.devices[i].model[j].url; //取得模組url
            }
            isFindDevice = true; //標示找到
            break;
          }
        }
      }
    }

    if(isFindDevice){
      return url;
    }else{
      console.log("[id2Url.js] url沒找到!");
      return 6;
    }
  }
};

  

