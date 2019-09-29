const monitor = require ('./monitor.js');
const testInputs = require ('./test-inputs.json');
//not needed?
//var mocha = require('mocha');
var assert = require('chai').assert;

var currentStock = testInputs.threeObjects;
var newStock = testInputs.fiveObjects;
var currentShallow = [];

//make currentShallow
for (i in currentStock) {
  currentShallow.push(currentStock[i].id);
};


describe('New item and restock tests', function() {

  it('finds the correct amount of new items', function(done) {
    var actual = monitor.findNewItems(newStock, currentShallow)
    assert.lengthOf(actual, 2, 'array has a length of 2');
    console.log(actual[0])
    done();
  })

  it('finds the correct amount of restocks', function(done) {
    assert.lengthOf(monitor.findRestocks(currentStock, newStock, currentShallow), 3, 'array has a length of 3');
    done();
  })

});
