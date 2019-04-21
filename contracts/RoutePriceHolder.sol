pragma solidity >=0.4.24;

import { Owned } from "./Owned.sol";
import { TollBoothHolder } from "./TollBoothHolder.sol";
import { RoutePriceHolderI } from "./interfaces/RoutePriceHolderI.sol";

contract RoutePriceHolder is Owned, TollBoothHolder, RoutePriceHolderI {
    mapping (address => mapping(address => Route)) hashedRoutes;
    struct Route {
        uint price;
        PendingPayment[] PendingPayments;
    }
    struct PendingPayment {
        bytes32 hashedSecret;
        uint depositedWeis;
        uint multiplier;
        address vehicleAddress;
    }
    constructor() public {
    }
    
    function setRoutePrice(address entryBooth, address exitBooth, uint priceWeis) public fromOwner returns(bool success) {        
        require(isTollBooth(entryBooth) && entryBooth != address(0), "Error: entry booth is not registered or is 0x address");
        require(isTollBooth(exitBooth) && exitBooth != address(0), "Error: exit booth is not registered or is 0x address");
        require(entryBooth != exitBooth, "Error: entry and exit booth can't be the same");
        uint currentPrice = hashedRoutes[entryBooth][exitBooth].price;
        require(currentPrice != priceWeis, "Error: priceWeis is the same");
        emit LogRoutePriceSet(msg.sender, entryBooth, exitBooth, priceWeis);
        hashedRoutes[entryBooth][exitBooth].price = priceWeis;
        return true;
    }

    function getRoutePrice(address entryBooth, address exitBooth) public view returns(uint priceWeis) {
        return hashedRoutes[entryBooth][exitBooth].price;
    }

}