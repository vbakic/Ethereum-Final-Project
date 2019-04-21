pragma solidity >=0.4.24;

import { Owned } from "./Owned.sol";
import { DepositHolderI } from "./interfaces/DepositHolderI.sol";

contract DepositHolder is Owned, DepositHolderI {
    uint deposit;
    constructor(uint initialDeposit) public {
        require(initialDeposit != 0, "Error: initial deposit cannot be zero.");
        deposit = initialDeposit;
    }
    function setDeposit(uint depositWeis) public fromOwner returns(bool success) {
        require(depositWeis > 0, "Error: deposit must be grater than zero.");
        require(depositWeis != deposit, "Error: deposit can't be the same as existing.");
        emit LogDepositSet(msg.sender, depositWeis);
        deposit = depositWeis;
        return true;
    }
    function getDeposit() public view returns(uint weis) {
        return deposit;
    }
}