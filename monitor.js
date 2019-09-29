const request = require('request');
const rp = require('request-promise');
const discord = require('discord.js');
const discordInfo = require('./discord-info.json');
const nikeURLs = require('./urls.json');

//remember to rename your .json file!
const hook = new discord.WebhookClient(discordInfo.hookId, discordInfo.hookToken);


var cycle = 0; //dont change this
var refreshDelay = 300000; //default is 5 mins (300000), feel free to change
var currentStock = [];
var newStock = [];
var th_launch_link = 'https://www.nike.com/th/launch/t/'

// TODO : refactors parameter name
// arr2 refer to new stock response
function findRestocks(arr1, arr2, shallowArr1) {
  var restocks = [];
  //iterate through each item in newStock
  for (i in arr2) {
    //check if the items id matches an id from currentStock
    if (shallowArr1.includes(arr2[i].id)) {
      //set n equal to the index of the matching id in currentStock
      var n = shallowArr1.indexOf(arr2[i].id);
      //then iterate through each index in productInfo of current item
      for (j in arr2[i].productInfo) {
        //then iterate through each index in availableSkus and check if that sku was unavailable in currentStock
        //and available in newStock. If this is true, push an object with that items info to our restocks array
        //but first, check if the value is null for whatever reason (sort of a bug, needs fixing)
        if (arr1[n].productInfo[j] == null) {
          console.log('findRestocks cannot find product info in the new scan. Ignoring...');
          break;
        }
         for (k in arr2[i].productInfo[j].availableSkus) {
           if (arr1[n].productInfo[j].availableSkus[k].available === false && arr2[i].productInfo[j].availableSkus[k].available === true) {
             var launchid = "nothing";
             if (arr2[i].productInfo[j].hasOwnProperty('launchView')) {
               console.log(arr2[i].productInfo[j].launchView)
               launchid = arr2[i].productInfo[j].launchView.id;
             }
             var sizeVaraint = arr2[i].productInfo[j].skus[k].id;
             var link =  th_launch_link + arr2[i].publishedContent.properties.seo.slug;
             restocks.push({
               "thumbnail": arr2[i].productInfo[j].imageUrls.productImageUrl,
               "name": arr2[i].productInfo[j].productContent.title,
               "color": arr2[i].productInfo[j].productContent.colorDescription,
               "size": arr2[i].productInfo[j].skus[k].nikeSize,
               "price": 'B' + arr2[i].productInfo[j].merchPrice.currentPrice,
               "link": link,
               "launchId": launchid,
               "sizeVaraint": sizeVaraint,
               "checkout": 'https://gs.nike.com/?checkoutId=467b1823-b354-4039-a3da-ad641289576b&launchId=' + launchid + '&skuId=' + sizeVaraint + '&country=TH&locale=th&appId=com.nike.commerce.snkrs.web&returnUrl='+link,
             });
           }
         }
      }
    } else {
      //this means the item was most likely removed from the snkrs page for whatever reason
      console.log('Item not found in previous scan. Ignoring...');
    }
  }
  return restocks;
};

function findNewItems(arr2, shallowArr1) {
  var differences = [];
  for (i in arr2) {
    //if our new items were not previously in currentStock, push an object with that items info
    //to our differences array
    if (!shallowArr1.includes(arr2[i].id)) {
      var sizeArr = [];
      var launchid = "";
      var link = th_launch_link + arr2[i].publishedContent.properties.seo.slug
      if (arr2[i].productInfo[0].hasOwnProperty('launchView')) {
        launchid = arr2[i].productInfo[0].launchView.id;
      }
      for (j in arr2[i].productInfo[0].availableSkus){
        var sizeVaraint = arr2[i].productInfo[0].availableSkus[j].id
        var checkoutLink = 'https://gs.nike.com/?checkoutId=467b1823-b354-4039-a3da-ad641289576b&launchId=' + launchid + '&skuId=' + sizeVaraint + '&country=TH&locale=th&appId=com.nike.commerce.snkrs.web&returnUrl=' + link
        sizeArr.push({
          "sizeId": sizeVaraint,
          "checkoutLink": checkoutLink,
        });
      }
      
      differences.push({
        "thumbnail": arr2[i].productInfo[0].imageUrls.productImageUrl,
        "name": arr2[i].productInfo[0].productContent.title,
        "color": arr2[i].productInfo[0].productContent.colorDescription,
        "price": 'B' + arr2[i].productInfo[0].merchPrice.currentPrice,
        "link": link,
        "launchId": launchid,
        "sizeIds": sizeArr
      });
    }
  };
  return differences;
};

function updates(arr) {
  //if startup cycle, only do one scan and set it as currentStock
  if (cycle === 0) {
    currentStock = arr;
    console.log('Initial scan complete, ' + currentStock.length + ' items found. Drops and restocks will be checked in the next cycle.');
    console.log(Date());
    console.log(' ');
    hook.send('Now watching Nike Snkrs!');
    cycle++;
    //if any subsequent cycle, run functions to check for new items and restocks
  } else {
    newStock = arr;

    //create a shallow clone of currentStock with just ids for findNewItems() and findRestocks()
    currentShallow = [];
    for (i in currentStock) {
      currentShallow.push(currentStock[i].id);
    };

    //find all the new items from this scan and post them
    var newItems = findNewItems(newStock, currentShallow);
    for (i in newItems) {
      console.log('NEW ITEM: ' + newItems[i].link);
      hook.send({
        embeds: [{
          color: 3447003,
          thumbnail: {
            'url': newItems[i].thumbnail
          },
          title: 'NIKE SNKRS NEW ITEM',
          fields: [
            {
              name: 'Item:',
              value: newItems[i].name
            },
            {
              name: 'Color:',
              value: newItems[i].color
            },
            {
              name: 'Price:',
              value: newItems[i].price
            },
            {
              name: 'Link:',
              value: newItems[i].link
            },
            {
              name: 'Launch ID',
              value: newItems[i].launchId
            },
          ]
        }]
      })

      var customField=[];
      for (j in newItems[i].sizeIds){
        customField.push({
          name: newItems[i].sizeIds[j].sizeId,
          value: newItems[i].sizeIds[j].checkoutLink,
        })
      }
      hook.send({
        embeds: [{
          color: 3447003,
          thumbnail: {
            'url': newItems[i].thumbnail
          },
          title: 'Checkout links',
          fields: customField,
        }]
      })

    };

    //find all restocks by size from this scan and post them
    var restockedItems = findRestocks(currentStock, newStock, currentShallow);
    for (i in restockedItems) {
      console.log('RESTOCK: ' + restockedItems[i].link);
      hook.send({
        embeds: [{
          color: 3447003,
          thumbnail: {
            'url': restockedItems[i].thumbnail
          },
          title: 'NIKE SNKRS RESTOCK',
          fields: [
            {
              name: 'Item:',
              value: restockedItems[i].name
            },
            {
              name: 'Color:',
              value: restockedItems[i].color
            },
            {
              name: 'Size:',
              value: restockedItems[i].size
            },
            {
              name: 'Price:',
              value: restockedItems[i].price
            },
            {
              name: 'Link:',
              value: restockedItems[i].link
            },
            {
              name:'Launch ID',
              value: restockedItems[i].launchId
            },
          ]
        }]
      })
    };

    console.log('Cycle ' + cycle + ' complete!');
    console.log(Date());
    console.log(' ');
    currentStock = newStock;
    newStock = [];
    cycle++;
  }
};


function monitor() {

  var completeArr = [];
  var debugArr = [];
  //long chain of promises to make sure the 4 api calls happen asynchronously
  rp.get(nikeURLs.urls[0])
  .then((body) => {
    let json = JSON.parse(body);
    for (x in json.objects) {
        debugArr.push(json.objects[x]);
      if(!json.objects[x].publishedContent.properties.custom.restricted) {
        completeArr.push(json.objects[x]);
      }
    }
  })
  .then(() => {
    return rp.get(nikeURLs.urls[1]);
  })
  .then((body) => {
    let json = JSON.parse(body);
    for (x in json.objects) {
      if(!json.objects[x].publishedContent.properties.custom.restricted) {
        completeArr.push(json.objects[x]);
      }
    }
  })
  .then(() => {
    return rp.get(nikeURLs.urls[2]);
  })
  .then((body) => {
    let json = JSON.parse(body);
    for (x in json.objects) {
      if(!json.objects[x].publishedContent.properties.custom.restricted) {
        completeArr.push(json.objects[x]);
      }
    }
  })
  .then(() => {
    return rp.get(nikeURLs.urls[3]);
  })
  .then((body) => {
    let json = JSON.parse(body);
    for (x in json.objects) {
      if(!json.objects[x].publishedContent.properties.custom.restricted) {
        completeArr.push(json.objects[x]);
      }
    }
    console.log('')
    console.log('NEW DEBUG')
    for (i in debugArr){
    console.log('')
    console.log(i)
    console.log("All Info")
    console.log(debugArr[i].productInfo)
    console.log("MerchProduct : ")
    console.log(debugArr[i].productInfo[0].merchProduct)
    console.log("Skus : ")
    console.log(debugArr[i].productInfo[0].skus)
    console.log("Product Content : ")
    console.log(debugArr[i].productInfo[0].productContent)
    console.log("LaunchView : ")
    console.log(debugArr[i].productInfo[0].launchView)
  }
    return completeArr;
  })
  .then ((completeArr) => {
    updates(completeArr);
  })
  .catch ((err) => {
    console.log(err);
  })
  setTimeout(() => {
    monitor();
  }, refreshDelay);
};

monitor();

//testing exports
module.exports.findRestocks = findRestocks;
module.exports.findNewItems = findNewItems;
