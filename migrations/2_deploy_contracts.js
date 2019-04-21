var Regulator = artifacts.require("./Regulator.sol");
var TollBoothOperator = artifacts.require("./TollBoothOperator.sol");

module.exports = function (deployer) {
  deployer.deploy(Regulator).then(function() {
    return deployer.deploy(TollBoothOperator, false, 1, Regulator.address);
  });
}