pragma solidity >=0.4.24;

import { Owned } from "./Owned.sol";
import { RegulatorI } from "./interfaces/RegulatorI.sol";

import { TollBoothOperator } from "./TollBoothOperator.sol";
import { TollBoothOperatorI } from "./interfaces/TollBoothOperatorI.sol";

contract Regulator is Owned, RegulatorI {
    mapping (address => bool) operators;
    mapping (address => uint) vehicles;
    constructor() public {
    }
    
    function setVehicleType(address vehicle, uint vehicleType) public fromOwner returns(bool success) {
        require(vehicle != address(0), "Error: invalid vehicle address.");
        require(vehicleType != vehicles[vehicle], "Error: already that vehicle type.");
        emit LogVehicleTypeSet(msg.sender, vehicle, vehicleType);
        vehicles[vehicle] = vehicleType;
        return true;
    }

    function getVehicleType(address vehicle) public view returns(uint vehicleType) {
        return vehicles[vehicle];
    }

    function createNewOperator(address owner, uint deposit) public fromOwner returns(TollBoothOperatorI newOperator) {
        TollBoothOperator operatorInstance = new TollBoothOperator(true, deposit, address(this));
        operatorInstance.setOwner(owner);
        address instanceAddress = address(operatorInstance);
        emit LogTollBoothOperatorCreated(msg.sender, instanceAddress, owner, deposit);
        operators[instanceAddress] = true;
        return operatorInstance;
    }

    function removeOperator(address operator) public fromOwner returns(bool success) {
        require(operators[operator] == true, "Error: no operator at this address.");
        emit LogTollBoothOperatorRemoved(msg.sender, operator);
        operators[operator] = false;
        return true;
    }

    function isOperator(address operator) public view returns(bool indeed) {
        return operators[operator];
    }
    
}