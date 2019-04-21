pragma solidity >=0.4.24;

import { OwnedI } from "./interfaces/OwnedI.sol";

contract Owned is OwnedI {
    address owner;
    constructor() public {
        owner = msg.sender;
    }
    modifier fromOwner() {
        require(msg.sender == owner, "Error: you are not permitted to do that.");
        _;
    }
    function setOwner(address newOwner) public fromOwner returns(bool success) {
        require(newOwner != address(0), "Error: new owner address is invalid");
        require(newOwner != owner, "Error: new owner is the same");
        emit LogOwnerSet(owner, newOwner);
        owner = newOwner;
        return true;
    }
    function getOwner() public view returns(address) {
        return owner;
    }
}