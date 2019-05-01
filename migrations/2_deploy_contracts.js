var Regulator = artifacts.require("./Regulator.sol");
var TollBoothOperator = artifacts.require("./TollBoothOperator.sol");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(Regulator)
    .then(() => Regulator.deployed())
    .then(regulator => regulator.createNewOperator(accounts[1], 10, { from: accounts[0] }))
    .then(tx => { operator = TollBoothOperator.at(tx.logs[1].args.newOperator); })
    .then(() => console.log("Operator address: " + operator.address))
    .then(tx => operator.setPaused(false, { from: accounts[1] }))
}

