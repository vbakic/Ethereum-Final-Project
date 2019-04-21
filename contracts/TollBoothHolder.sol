pragma solidity >=0.4.24;

import { Owned } from "./Owned.sol";
import { TollBoothHolderI } from "./interfaces/TollBoothHolderI.sol";

contract TollBoothHolder is Owned, TollBoothHolderI {
    mapping (address => bool) tollBooths;
    constructor() public {
    }
    function addTollBooth(address tollBooth) public fromOwner returns(bool success) {
        require(tollBooth != address(0), "Error: invalid toll booth address.");
        require(!tollBooths[tollBooth], "Error: there is already a toll booth at given address.");
        emit LogTollBoothAdded(owner, tollBooth);
        tollBooths[tollBooth] = true;
        return true;
    }
    function isTollBooth(address tollBooth) public view returns(bool isIndeed) {
        return tollBooths[tollBooth];
    }
    function removeTollBooth(address tollBooth) public fromOwner returns(bool success) {
        require(tollBooth != address(0), "Error: invalid toll booth address.");
        require(tollBooths[tollBooth], "Error: there is no toll booth at the specified address.");
        emit LogTollBoothRemoved(owner, tollBooth);
        tollBooths[tollBooth] = false;
        return true;
    }
}