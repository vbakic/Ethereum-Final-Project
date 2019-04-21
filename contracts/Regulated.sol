pragma solidity >=0.4.24;

import { RegulatorI } from "./interfaces/RegulatorI.sol";
import { RegulatedI } from "./interfaces/RegulatedI.sol";

contract Regulated is RegulatedI {
    address regulatorAddress;
    RegulatorI regulator;
    constructor(address initialRegulator) public {
        require(initialRegulator != address(0), "Error: 0x address.");
        regulator = RegulatorI(initialRegulator);
    }

    function setRegulator(address newRegulator) public returns(bool success) {
        require(msg.sender == regulatorAddress, "Error: you're not permitted.");
        require(newRegulator != address(0), "Error: 0x address.");
        emit LogRegulatorSet(regulatorAddress, newRegulator);
        regulatorAddress = newRegulator;
        regulator = RegulatorI(newRegulator);
        return true;
    }

    function getRegulator() public view returns(RegulatorI) {
        return regulator;
    }

}