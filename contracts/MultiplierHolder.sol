pragma solidity >=0.4.24;

import { Owned } from "./Owned.sol";
import { MultiplierHolderI } from "./interfaces/MultiplierHolderI.sol";

contract MultiplierHolder is Owned, MultiplierHolderI {
    mapping (uint => uint) multipliers;
    constructor() public {
    }
    function setMultiplier(uint vehicleType, uint multiplier) public fromOwner returns(bool success) {
        require(vehicleType != 0, "Error: invalid vehicle type.");
        require(multipliers[vehicleType] != multiplier, "Error: provided multiplier already set for vehicle type.");
        emit LogMultiplierSet(owner, vehicleType, multiplier);
        multipliers[vehicleType] = multiplier;
        return true;
    }
    function getMultiplier(uint vehicleType) public view returns(uint multiplier) {
        return multipliers[vehicleType];
    }
}