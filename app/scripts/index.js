// Import the page's CSS. Webpack will know what to do with it.
import "../styles/app.css";

// Import libraries we need.
import { default as Web3 } from 'web3'
import { default as contract } from 'truffle-contract'
const Promise = require("bluebird");
const assert = require('assert-plus');

// Import our contract artifacts and turn them into usable abstractions.
import RegulatorArtifact from '../../build/contracts/Regulator.json'
const Regulator = contract(RegulatorArtifact);
import TollBoothOperatorArtifact from '../../build/contracts/TollBoothOperator.json'
const TollBoothOperator = contract(TollBoothOperatorArtifact);

let accounts, regulator, tollBoothOperator, owner, operatorOwner
let booths = []; 
let vehicles = [];
let hashedSecrets = [];

window.addEventListener('load', function () {
  if (typeof window.web3 !== 'undefined') {
      // Don't lose an existing provider, like Mist or Metamask
      window.web3 = new Web3(web3.currentProvider);
  } else {
      // set the provider you want from Web3.providers
      window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
  }
  web3.eth.getTransactionReceiptMined = require("../../utils/getTransactionReceiptMined.js");
  // Promisify all functions of web3.eth and web3.version
  Promise.promisifyAll(web3.eth, { suffix: "Promise" });
  Promise.promisifyAll(web3.version, { suffix: "Promise" });
  
  
  App.start()
  window.App = App
})

const App = {

  start: async function () {
    const self = this

    // Bootstrap the Contract abstraction for Use.
    Regulator.setProvider(web3.currentProvider)
    TollBoothOperator.setProvider(web3.currentProvider)

    regulator = await Regulator.deployed();
    tollBoothOperator = await TollBoothOperator.deployed();

    accounts = await web3.eth.getAccountsPromise();

    if (accounts.length < 6){
      throw new Error("Not enough available accounts!");
    }
    else {
      owner = accounts[0];
      vehicles[0] = accounts[1];
      vehicles[1] = accounts[2];
      booths[0] = accounts[3];
      booths[1] = accounts[4];
      operatorOwner = accounts[5];
      jQuery("#vehicle1").html(vehicles[0]);
      jQuery("#vehicle2").html(vehicles[1]);
      jQuery("#booth1").html(booths[0]);
      jQuery("#booth2").html(booths[1]);
      jQuery("#regulatorOwner").html(owner);
      jQuery("#operatorOwner").html(operatorOwner);
    }

    self.refreshAccountBalances();
    self.updateHashedSecrets();

  },

  updateHashedSecrets: async function() {
    hashedSecrets[0] = await tollBoothOperator.hashSecret(jQuery("#secret1").val());
    hashedSecrets[1] = await tollBoothOperator.hashSecret(jQuery("#secret2").val());
    jQuery("#hashedSecret").html(hashedSecrets[0]);
    jQuery("#hashedSecret2").html(hashedSecrets[1]);
  },

  getVehicleEntry: async function() {
    let hashedSecretToCheck = await tollBoothOperator.hashSecret(jQuery("#secretToCheck").val());
    let result = await tollBoothOperator.getVehicleEntry(hashedSecretToCheck);
    jQuery("#vehicleAddress").val(result[0]);
    jQuery("#entryBoothInfo").val(result[1]);
    jQuery("#depositedWeis").val(result[2].toString());
  },

  reportExitRoad: async function() {
    let tx = await tollBoothOperator.reportExitRoad(jQuery("#secret").val(), { from: booths[1] });
    const logExited = tx.logs[0].args;
    if(tx.receipt.status == "0x1") {
      let messageText = "Exit on booth2 reported, vehicle charged " + logExited.finalFee.toNumber() + " and refunded " + logExited.refundWeis.toNumber();
      jQuery("#vehicleExits").append('<li><span class="tab">' + messageText + '</span></li>');
      jQuery("#successMessage").html(messageText).show().delay(5000).fadeOut()
    }
  },

  entryDeposit: async function(index) {
    await this.updateHashedSecrets();
    let amountToDeposit = jQuery("#deposit").val();
    let txHash = await tollBoothOperator.enterRoad.sendTransaction(booths[0], hashedSecrets[index], { from: vehicles[index], value: amountToDeposit, gas: 150000 });
    let success = await this.followUpTransaction(txHash);
    if(success) {
      jQuery("#vehicleEntries").append('<li><span class="tab">' + amountToDeposit + " deposited by vehicle" + (index+1) + " at entry booth " + booths[0] + '</span></li>');
      jQuery("#successMessage").html(amountToDeposit + " deposited by vehicle " + vehicles[index] + " at entry booth " + booths[0]).show().delay(5000).fadeOut()
    }
  },

  refreshAccountBalances: async function () {
    const vehicle1 = await web3.eth.getBalancePromise(vehicles[0]);
    const vehicle2 = await web3.eth.getBalancePromise(vehicles[1]);
    jQuery("#vehicle1Balance").val(vehicle1);
    jQuery("#vehicle2Balance").val(vehicle2);
  },

  addTollBooth: async function(index) {
    let txHash = await tollBoothOperator.addTollBooth.sendTransaction(booths[index], { from: owner });
    let success = await this.followUpTransaction(txHash);
    if(success) {
      jQuery("#successMessage").html("New toll booth added at " + booths[index] + " address ").show().delay(5000).fadeOut()
    }
  },

  addBaseRoutePrice: async function() {
    let basePrice = jQuery("#baseRoutePrice").val();
    let txHash = await tollBoothOperator.setRoutePrice.sendTransaction(booths[0], booths[1], basePrice, { from: owner });
    let success = await this.followUpTransaction(txHash);
    if(success) {
      jQuery("#successMessage").html("Route price " + basePrice + " set for route between " + booths[0] + " and "  + booths[1]).show().delay(5000).fadeOut()
    }
  },

  setMultiplier: async function() {
    let multiplier = jQuery("#multiplier").val();
    let vehicleType = jQuery("#vehicleTypeOperator").val();
    let txHash = await await tollBoothOperator.setMultiplier.sendTransaction(vehicleType, multiplier, { from: owner });
    let success = await this.followUpTransaction(txHash);
    if(success) {
      jQuery("#successMessage").html("Multiplier " + multiplier + " set for vehicle type " + vehicleType).show().delay(5000).fadeOut()
    }
  },

  updateVehicleType: async function(index) {
    let vehicleAddress = vehicles[index];
    let newVehicleType = jQuery("#vehicleType").val();
    let txHash = await regulator.setVehicleType.sendTransaction(vehicleAddress, newVehicleType, { from: owner });
    let success = await this.followUpTransaction(txHash);
    if(success) {
      jQuery("#successMessage").html("Vehicle type successfully updated to " + newVehicleType + " for address " + vehicleAddress).show().delay(5000).fadeOut()
    }
  },

  createNewOperator: async function() {
    //unfortunately this function will throw a revert error.
    let txHash = await regulator.createNewOperator.sendTransaction(operatorOwner, 1, { from: owner });
    let success = await this.followUpTransaction(txHash);
    console.log(success);
  },

  followUpTransaction: async function(txHash) {
    console.log("Your transaction is on the way, waiting to be mined!", txHash);
    let receipt = await web3.eth.getTransactionReceiptMined(txHash);
    console.log(receipt);
    assert.strictEqual(parseInt(receipt.status), 1);
    console.log("Your transaction executed successfully!");
    return true;
  },
 
}