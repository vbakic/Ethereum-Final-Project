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

Regulator.defaults({
  gas: 6000000 //this had to be raised in order to create new Operator
})

let accounts, regulator, tollBoothOperator, regulatorOwner, operatorOwner
let booths = []; 
let vehicles = [];
let hashedSecrets = [];

$(document).ready(function() {
  $('#tabs li a:not(:first)').addClass('inactive');
      $('.container').hide();
      $('.container:first').show();                    
      $('#tabs li a').click(function(){
          var t = $(this).attr('id');
      if($(this).hasClass('inactive')){ //this is the start of our condition 
          $('#tabs li a').addClass('inactive');           
          $(this).removeClass('inactive');                    
          $('.container').hide();
          $('#'+ t + 'C').fadeIn('slow');
      }
  });
});

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

    let transferEvent = await regulator.LogTollBoothOperatorCreated({}, {fromBlock: 0, toBlock: 'latest'})
    transferEvent.get((error, logs) => {
      if(logs.length >= 1) {
        jQuery(".operators").css('display', 'block');
        jQuery("#operators").html('<tr><th>Operator address</th><th>Operator owner address</th></tr>');
      }

      logs.forEach(log => {
        jQuery("#operators").append('<tr><td>' + log.args.newOperator + '</td><td>' + log.args.owner + '</td></tr>');
      });

      jQuery("#operatorAddressInput").val(logs[0].args.newOperator);
      self.loadExistingOperator(); //load the first operator that has been created

    })

    accounts = await web3.eth.getAccountsPromise();

    if (accounts.length < 6){
      throw new Error("Not enough available accounts!");
    }
    else {
      regulatorOwner = accounts[0];
      operatorOwner = accounts[1];
      vehicles[0] = accounts[2];
      vehicles[1] = accounts[3];
      booths[0] = accounts[4];
      booths[1] = accounts[5];      
      jQuery("#vehicle1").html(vehicles[0]);
      jQuery("#vehicle2").html(vehicles[1]);
      jQuery("#booth1").html(booths[0]);
      jQuery("#booth2").html(booths[1]);
      jQuery("#regulatorOwner").html(regulatorOwner);
      jQuery("#operatorOwner").html("Not set yet");

      for(let i=0; i< accounts.length; i++) {
        jQuery("#accountsList").append('<li>' + accounts[i] + '</li>');
      }

    }

    self.refreshAccountBalances();

  },

  loadExistingOperator: async function() {
    
    let operatorAddress = jQuery("#operatorAddressInput").val();
    tollBoothOperator = await TollBoothOperator.at(operatorAddress);

    if(tollBoothOperator) {
      jQuery("#loader").css("display", "none");
      jQuery("#content").css("display", "block");
    }

    let transferEvent = await tollBoothOperator.LogRoadEntered({}, {fromBlock: 0, toBlock: 'latest'})
    transferEvent.get((error, logs) => {
      if(logs.length >= 1) {
        jQuery(".vehicleEntries").css('display', 'block');
        jQuery("#vehicleEntries").html('<tr><th>Vehicle</th><th>Entry booth</th><th>Deposit amount</th></tr>');
      }
      logs.forEach(log => {
        jQuery("#vehicleEntries").append('<tr><td>' + 
            log.args.vehicle + '</td><td>' + 
            log.args.entryBooth + '</td><td>' + 
            log.args.depositedWeis.toNumber() + '</td></tr>');
      });
    });

    let transferEvent2 = await tollBoothOperator.LogRoadExited({}, {fromBlock: 0, toBlock: 'latest'})
    transferEvent2.get((error, logs) => {
      if(logs.length >= 1) {
        jQuery(".vehicleExits").css('display', 'block');
        jQuery("#vehicleExits").html('<tr><th>Exit booth</th><th>Exit secret hashed</th><th>Charged</th><th>Refunded</th></tr>');
      }
      logs.forEach(log => {
        jQuery("#vehicleExits").append('<tr><td>' + 
            log.args.exitBooth + '</td><td>' + 
            log.args.exitSecretHashed + '</td><td>' + 
            log.args.finalFee.toNumber() + '</td><td>' + 
            log.args.refundWeis.toNumber() + '</td></tr>');
      });
    });

    let transferEvent3 = await tollBoothOperator.LogPendingPayment({}, {fromBlock: 0, toBlock: 'latest'})
    transferEvent3.get((error, logs) => {
      if(logs.length >= 1) {
        jQuery(".pendingPayments").css('display', 'block');
        jQuery("#pendingPayments").html('<tr><th>Entry booth</th><th>Exit booth</th><th>Exit Secret Hashed</th></tr>');
      }
      logs.forEach(log => {
        jQuery("#pendingPayments").append('<tr><td>' + log.args.entryBooth + '</td><td>' + 
            log.args.exitBooth + '</td><td>' + log.args.exitSecretHashed + '</td></tr>');
      });
    });

    jQuery(".operatorFunctions, .onlyIfOperatorLoaded").css("display", "block");
    
  },

  createNewOperator: async function() {

    let newOperatorOwner = jQuery("#operatorOwnerInput").val();
    let tx = await regulator.createNewOperator(newOperatorOwner, 1, { from: regulatorOwner, gas: 6000000 });
    let newOperatorAddress = tx.logs[1].args.newOperator;    
    let operator = await TollBoothOperator.at(newOperatorAddress);    
    await operator.setPaused(false, { from: newOperatorOwner });

    let messageText = "New Toll Booth operator created at address " + newOperatorAddress + " owned by " + newOperatorOwner;
    jQuery(".operators").css('display', 'block');
    jQuery("#operators").append('<tr><td>' + newOperatorAddress + '</td><td>' + newOperatorOwner + '</td></tr>');
    jQuery("#successMessage").html(messageText).show().delay(5000).fadeOut();
    
  },

  followUpTransaction: async function(txHash) {
    console.log("Your transaction is on the way, waiting to be mined!", txHash);
    let receipt = await web3.eth.getTransactionReceiptMined(txHash);
    assert.strictEqual(parseInt(receipt.status), 1);
    console.log("Your transaction executed successfully!");
    return true;
  },

  updateHashedSecrets: async function() {
    hashedSecrets[0] = await tollBoothOperator.hashSecret(jQuery("#secret1").val());
    hashedSecrets[1] = await tollBoothOperator.hashSecret(jQuery("#secret2").val());
  },

  getVehicleEntry: async function() {
    let hashedSecretToCheck = await tollBoothOperator.hashSecret(jQuery("#secretToCheck").val());
    let result = await tollBoothOperator.getVehicleEntry(hashedSecretToCheck);
    jQuery("#vehicleAddress").val(result[0]);
    jQuery("#entryBoothInfo").val(result[1]);
    jQuery("#depositedWeis").val(result[2].toString());
  },

  reportExitRoad: async function() {
    let tx = await tollBoothOperator.reportExitRoad(jQuery("#secret").val(), { from: booths[1], gas: 400000 });
    if(tx.receipt.status == "0x1") {
      if(tx.logs[0].event == "LogRoadExited") {
        const logExited = tx.logs[0].args;
        jQuery(".vehicleExits").css('display', 'block');
        jQuery("#vehicleExits").append('<tr><td>' + logExited.exitBooth + '</td><td>' + 
            logExited.exitSecretHashed + '</td><td>' + logExited.finalFee.toNumber() + '</td><td>' + 
            logExited.refundWeis.toNumber() + '</td></tr>');
        let messageText = "Exit on booth2 reported, vehicle charged " + 
            logExited.finalFee.toNumber() + " and refunded " + logExited.refundWeis.toNumber();
        jQuery("#successMessage").html(messageText).show().delay(5000).fadeOut();
      } else if(tx.logs[0].event == "LogPendingPayment") {
        const logPendingPayment = tx.logs[0].args;
        jQuery(".pendingPayments").css('display', 'block');
        jQuery("#pendingPayments").append('<tr><td>' + 
            logPendingPayment.entryBooth + '</td><td>' + logPendingPayment.exitBooth + '</td><td>' + 
            logPendingPayment.exitSecretHashed + '</td></tr>');
        let messageText = "Pending payment recorded, vehicle entered at " + 
            logPendingPayment.entryBooth + " and awaits exit at " + logPendingPayment.exitBooth;
        jQuery("#successMessage").html(messageText).show().delay(5000).fadeOut();
      }      
    }
  },

  entryDeposit: async function(index) {
    await this.updateHashedSecrets();
    let amountToDeposit = jQuery("#deposit").val();
    let txHash = await tollBoothOperator.enterRoad.sendTransaction(booths[0], hashedSecrets[index], 
        { from: vehicles[index], value: amountToDeposit, gas: 150000 });
    let success = await this.followUpTransaction(txHash);
    if(success) {
      jQuery(".vehicleEntries").css('display', 'block');
      jQuery("#vehicleEntries").append('<tr><td>' + vehicles[index] + '</td><td>' + 
          booths[0] + '</td><td>' + amountToDeposit + '</td></tr>');
      jQuery("#successMessage").html(amountToDeposit + " deposited by vehicle " + 
          vehicles[index] + " at entry booth " + 
          booths[0]).show().delay(5000).fadeOut();
      this.refreshAccountBalances();
    }
  },

  refreshAccountBalances: async function () {
    const vehicle1 = await web3.eth.getBalancePromise(vehicles[0]);
    const vehicle2 = await web3.eth.getBalancePromise(vehicles[1]);
    jQuery("#vehicle1Balance").val(vehicle1);
    jQuery("#vehicle2Balance").val(vehicle2);
  },

  addTollBooth: async function(index) {
    let txHash = await tollBoothOperator.addTollBooth.sendTransaction(booths[index], { from: operatorOwner });
    let success = await this.followUpTransaction(txHash);
    if(success) {
      jQuery("#successMessage").html("New toll booth added at " + booths[index] + " address ").show().delay(5000).fadeOut()
    }
  },

  addBaseRoutePrice: async function() {
    let basePrice = jQuery("#baseRoutePrice").val();
    let txHash = await tollBoothOperator.setRoutePrice.sendTransaction(booths[0], booths[1], basePrice, 
      { from: operatorOwner, gas: 500000 });
    let success = await this.followUpTransaction(txHash);
    if(success) {
      jQuery("#successMessage").html("Route price " + basePrice + " set for route between " + 
          booths[0] + " and "  + booths[1]).show().delay(5000).fadeOut();
    }
  },

  setMultiplier: async function() {
    let multiplier = jQuery("#multiplier").val();
    let vehicleType = jQuery("#vehicleTypeOperator").val();
    let txHash = await tollBoothOperator.setMultiplier.sendTransaction(vehicleType, multiplier, { from: operatorOwner });
    let success = await this.followUpTransaction(txHash);
    if(success) {
      jQuery("#successMessage").html("Multiplier " + multiplier + " set for vehicle type " + 
          vehicleType).show().delay(5000).fadeOut();
    }
  },

  updateVehicleType: async function(index) {
    let vehicleAddress = vehicles[index];
    let newVehicleType = jQuery("#vehicleType").val();
    let txHash = await regulator.setVehicleType.sendTransaction(vehicleAddress, newVehicleType, { from: regulatorOwner });
    let success = await this.followUpTransaction(txHash);
    if(success) {
      jQuery("#successMessage").html("Vehicle type successfully updated to " + newVehicleType + " for address " + 
          vehicleAddress).show().delay(5000).fadeOut();
    }
  }

}