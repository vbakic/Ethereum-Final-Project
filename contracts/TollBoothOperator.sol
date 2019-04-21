pragma solidity >=0.4.24;

import { Pausable } from "./Pausable.sol";
import { RoutePriceHolder } from "./RoutePriceHolder.sol";
import { MultiplierHolder } from "./MultiplierHolder.sol";
import { DepositHolder } from "./DepositHolder.sol";
import { Regulated } from "./Regulated.sol";

import { TollBoothOperatorI } from "./interfaces/TollBoothOperatorI.sol";

contract TollBoothOperator is Pausable, RoutePriceHolder, MultiplierHolder, DepositHolder, Regulated, TollBoothOperatorI {
    
    uint internal collectedFeesAmount;
    mapping (bytes32 => VehicleEntry) vehicleEntries;

    struct VehicleEntry {
        bool hasEntered;
        bool hasExited;
        address vehicle;
        address entryBooth;
        uint depositedWeis;
    }

    function() public {
        revert();
    }

    constructor(bool initialState, uint initialDepositWei, address initialRegulatorAddress) public 
        Regulated(initialRegulatorAddress) Pausable(initialState) DepositHolder(initialDepositWei) {
    }

    function hashSecret(bytes32 secret) public view returns(bytes32 hashed) {
        return keccak256(abi.encodePacked(secret, address(this))); //to be updated
    }

    function enterRoad(address entryBooth, bytes32 exitSecretHashed) public payable whenNotPaused returns (bool success) {
        uint vehicleType = regulator.getVehicleType(msg.sender);
        require(vehicleType != 0, "Error: vehicle not registered.");
        require(isTollBooth(entryBooth), "Error: not valid entry booth.");
        uint multiplier = getMultiplier(vehicleType);
        require(multiplier > 0, "Error: vehicle is not allowed on this road system.");
        require(!vehicleEntries[exitSecretHashed].hasEntered, "Error: vehicle already entered the at this booth using this secret.");
        
        if(vehicleEntries[exitSecretHashed].hasEntered) {
            require(vehicleEntries[exitSecretHashed].vehicle == msg.sender, "Error: exitSecretHashed has already been used by other vehicle!");
        } else {
            require(msg.value >= deposit * multiplier, "Error: not enough Ether deposited.");
        }
        
        emit LogRoadEntered(msg.sender, entryBooth, exitSecretHashed, msg.value);
        vehicleEntries[exitSecretHashed].hasEntered = true;
        vehicleEntries[exitSecretHashed].vehicle = msg.sender;
        vehicleEntries[exitSecretHashed].entryBooth = entryBooth;
        vehicleEntries[exitSecretHashed].depositedWeis += msg.value;
        return true;
    }

    function getVehicleEntry(bytes32 exitSecretHashed) public view returns(address vehicle, address entryBooth, uint depositedWeis) {
        return (vehicleEntries[exitSecretHashed].vehicle, 
                vehicleEntries[exitSecretHashed].entryBooth, 
                vehicleEntries[exitSecretHashed].depositedWeis);
    }

    function reportExitRoad(bytes32 exitSecretClear) public whenNotPaused returns (uint status) {
        require(isTollBooth(msg.sender), "Error: not a toll booth.");
        
        bytes32 hashedSecret = hashSecret(exitSecretClear);
        require(vehicleEntries[hashedSecret].hasEntered, "Error: secret does not match hashed one.");

        address vehicleAddress = vehicleEntries[hashedSecret].vehicle;

        uint vehicleType = regulator.getVehicleType(vehicleAddress);
        require(vehicleType != 0, "Error: vehicle not registered.");
        uint multiplier = getMultiplier(vehicleType);
        require(multiplier > 0, "Error: vehicle is not allowed on this road system.");

        address entryBooth = vehicleEntries[hashedSecret].entryBooth;
        require(entryBooth != msg.sender, "Error: entry booth same as exit.");        
        require(!vehicleEntries[hashedSecret].hasExited, "Error: exit already reported.");

        uint baseRoutePrice = getRoutePrice(entryBooth, msg.sender);

        if(baseRoutePrice > 0) {

            uint routePrice = baseRoutePrice * multiplier;
            uint vehicleBalance = vehicleEntries[hashedSecret].depositedWeis;

            uint finalFee = routePrice;
            uint refundWeis = 0;

            if(routePrice >= vehicleBalance) {
                finalFee = vehicleBalance;
            } else {
                refundWeis = vehicleBalance - routePrice;
                vehicleAddress.transfer(refundWeis);
            }
            
            emit LogRoadExited(msg.sender, hashedSecret, finalFee, refundWeis);
            vehicleEntries[hashedSecret].hasExited = true;
            vehicleEntries[hashedSecret].depositedWeis = 0;
            collectedFeesAmount += finalFee;
            return 1;
            
        } else {
            emit LogPendingPayment(hashedSecret, entryBooth, msg.sender);
            PendingPayment memory newPendingPayment;
            newPendingPayment.hashedSecret = hashedSecret;
            newPendingPayment.vehicleAddress = vehicleAddress;
            newPendingPayment.multiplier = multiplier;
            newPendingPayment.depositedWeis = vehicleEntries[hashedSecret].depositedWeis;
            hashedRoutes[entryBooth][msg.sender].PendingPayments.push(newPendingPayment);
            return 2;
        }

    }

    function getPendingPaymentCount(address entryBooth, address exitBooth) public view returns (uint count) {
        return hashedRoutes[entryBooth][exitBooth].PendingPayments.length;
    }

    function clearSomePendingPayments(address entryBooth, address exitBooth, uint count) public whenNotPaused returns (bool success) {

        require(isTollBooth(entryBooth), "Error: not a toll booth.");
        require(isTollBooth(exitBooth), "Error: not a toll booth.");

        uint pendingPaymentsPerRoute = getPendingPaymentCount(entryBooth, exitBooth);

        require(count <= pendingPaymentsPerRoute, "Error: too many payments selected to clear.");

        uint baseRoutePrice = getRoutePrice(entryBooth, exitBooth);
        
        for (uint i = 0; i < count; i++) {

            PendingPayment memory pendingPayment = hashedRoutes[entryBooth][exitBooth].PendingPayments[i];
            
            uint finalFee = baseRoutePrice * pendingPayment.multiplier;
            uint refundWeis = 0;

            if(finalFee > pendingPayment.depositedWeis) {
                finalFee = pendingPayment.depositedWeis;
            } else {
                refundWeis = pendingPayment.depositedWeis - finalFee;
                pendingPayment.vehicleAddress.transfer(refundWeis);
            }
            
            emit LogRoadExited(exitBooth, pendingPayment.hashedSecret, finalFee, refundWeis);
            vehicleEntries[pendingPayment.hashedSecret].hasExited = true;
            vehicleEntries[pendingPayment.hashedSecret].depositedWeis = 0;
            collectedFeesAmount += finalFee;
            
        }

        if(pendingPaymentsPerRoute > 1) {
            for (uint j = count; j < pendingPaymentsPerRoute; j++) {
                hashedRoutes[entryBooth][exitBooth].PendingPayments[j-count] = hashedRoutes[entryBooth][exitBooth].PendingPayments[j];
            }
            hashedRoutes[entryBooth][exitBooth].PendingPayments.length -= count;
        } else {
            hashedRoutes[entryBooth][exitBooth].PendingPayments.length = 0;
        }
        
        return true;
    }

    function getCollectedFeesAmount() public view returns(uint amount) {
        return collectedFeesAmount;
    }

    function withdrawCollectedFees() public fromOwner returns(bool success) {
        require(collectedFeesAmount > 0, "Error: no fees to collect.");
        uint amountToWithdraw = collectedFeesAmount;
        collectedFeesAmount = 0;
        emit LogFeesCollected(owner, amountToWithdraw);
        owner.transfer(amountToWithdraw);
        return true;
    }

    function setRoutePrice(address entryBooth, address exitBooth, uint priceWeis) public returns(bool success) {

        require(isTollBooth(entryBooth) && entryBooth != address(0), "Error: entry booth is not registered or is 0x address");
        require(isTollBooth(exitBooth) && exitBooth != address(0), "Error: exit booth is not registered or is 0x address");
        require(entryBooth != exitBooth, "Error: entry and exit booth can't be the same");
        uint currentPrice = hashedRoutes[entryBooth][exitBooth].price;
        require(currentPrice != priceWeis, "Error: priceWeis is the same");
        emit LogRoutePriceSet(msg.sender, entryBooth, exitBooth, priceWeis);
        hashedRoutes[entryBooth][exitBooth].price = priceWeis;

        if(getPendingPaymentCount(entryBooth, exitBooth) > 0) {
            clearSomePendingPayments(entryBooth, exitBooth, 1);
        }

        return true;
    }


}