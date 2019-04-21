pragma solidity >=0.4.24;

import { Owned } from "./Owned.sol";
import { PausableI } from "./interfaces/PausableI.sol";

contract Pausable is Owned, PausableI {
    bool paused;
    constructor(bool initialState) public {
        paused = initialState;
    }
    modifier whenPaused() {
        require(paused, "Error: contract not paused.");
        _;
    }
    modifier whenNotPaused() {
        require(!paused, "Error: contract paused.");
        _;
    }
    function isPaused() public view returns(bool isIndeed) {
        return paused;
    }
    function setPaused(bool newState) public fromOwner returns(bool success) {
        require(newState != paused, "Error: contract already in that state.");
        emit LogPausedSet(msg.sender, newState);
        paused = newState;
        return true;
    }   
}