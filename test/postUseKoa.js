var request = require('sync-request');

templateJSON = {"city":"Dubai"};

const id2Url = (param1, param2) => {
  return param1 * param2;
};

var res = request('POST', 'http://127.0.0.1:3000/webhook', {

  headers: {       
    'content-type': 'application/json'
  },

  body: JSON.stringify(templateJSON)

});

function main() {
  console.log("Hello world");
}

if (require.main === module) {
  main();
}