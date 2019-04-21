/* global web3 assert artifacts contract describe before beforeEach it */
require("babel-core/register");
require("babel-polyfill");
const expectedExceptionPromise = require("../utils/expectedException.js");
web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
const Promise = require("bluebird");
Promise.allNamed = require("../utils/sequentialPromiseNamed.js");
const randomIntIn = require("../utils/randomIntIn.js");
const toBytes32 = require("../utils/toBytes32.js");

if (typeof web3.eth.getAccountsPromise === "undefined") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

const Regulator = artifacts.require("./Regulator.sol");
const TollBoothOperator = artifacts.require("./TollBoothOperator.sol");

let totalGas = 0;

contract("TollBoothOperator", accounts => {

    const [regulatorOwner, operatorOwner, booth1, booth2, vehicle1, vehicle2] = accounts;

    const vehicleType1 = 1;
    const vehicleType2 = 2;
    const multiplier1 = 1;
    const multiplier2 = 1;
    const basePrice1 = 10;
    const basePrice2 = 15;
    const basePrice3 = 6;
    const basePrice4 = 11;
    const deposit = 10;
    const actualDeposit1 = deposit * multiplier1;
    const actualDeposit2 = (deposit + 4) * multiplier1;
    const actualDeposit3 = deposit * multiplier2;
    const tmpSecret = randomIntIn(1, 1000);
    const secret = toBytes32(tmpSecret);
    let hashedSecret;
    const tmpSecret2 = randomIntIn(1, 1000);
    const secret2 = toBytes32(tmpSecret2);
    let hashedSecret2;
    let regulator, operator;
    let vehicle1BalanceInitial;
    let vehicle2BalanceInitial;
    
    describe("Vehicle Operations", async () => {
        
        beforeEach("should deploy regulator and operator", async () => {
            regulator = await Regulator.new({ from: regulatorOwner });
            let tx = await regulator.createNewOperator(operatorOwner, deposit, { from: regulatorOwner });
            operator = await TollBoothOperator.at(tx.logs[1].args.newOperator);
            await regulator.setVehicleType(vehicle1, vehicleType1, { from: regulatorOwner });
            await regulator.setVehicleType(vehicle2, vehicleType2, { from: regulatorOwner });
            await operator.addTollBooth(booth1, { from: operatorOwner });
            await operator.addTollBooth(booth2, { from: operatorOwner });
            await operator.setMultiplier(vehicleType1, multiplier1, { from: operatorOwner });
            await operator.setMultiplier(vehicleType2, multiplier2, { from: operatorOwner });            
            await operator.setPaused(false, { from: operatorOwner });            
            hashedSecret = await operator.hashSecret(secret);
            hashedSecret2 = await operator.hashSecret(secret2);
        });

        describe("Scenarios 1-3", async () => {

            beforeEach("should enter road", async () => {
                await operator.setRoutePrice(booth1, booth2, basePrice1, { from: operatorOwner });
                await operator.enterRoad(booth1, hashedSecret, { from: vehicle1, value: actualDeposit1 });
                vehicle1BalanceInitial = await web3.eth.getBalancePromise(vehicle1);
            });

            it("Scenario 1 - vehicle deposits exactly the route price", async () => {

                let expectedFee = actualDeposit1;

                let tx = await operator.reportExitRoad(secret, { from: booth2 });
                totalGas += tx.receipt.gasUsed;
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logExited = tx.logs[0];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth2);
                assert.strictEqual(logExited.args.exitSecretHashed, hashedSecret);
                assert.strictEqual(logExited.args.finalFee.toNumber(), expectedFee);
                assert.strictEqual(logExited.args.refundWeis.toNumber(), 0);
                
                let collected = await operator.getCollectedFeesAmount();
                let operatorBalance = await web3.eth.getBalancePromise(operator.address);                
                let vehicle1Balance = await web3.eth.getBalancePromise(vehicle1);

                assert.strictEqual(collected.toNumber(), expectedFee);
                assert.strictEqual(operatorBalance.toNumber(), expectedFee);
                assert.strictEqual(vehicle1Balance.toNumber(), vehicle1BalanceInitial.toNumber());
                
            });

            it("Scenario 2 - vehicle deposits less than the route price", async () => {

                let expectedFee = actualDeposit1;

                await operator.setRoutePrice(booth1, booth2, basePrice2, { from: operatorOwner });

                let tx = await operator.reportExitRoad(secret, { from: booth2 });
                
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logExited = tx.logs[0];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth2);
                assert.strictEqual(logExited.args.exitSecretHashed, hashedSecret);
                assert.strictEqual(logExited.args.finalFee.toNumber(), expectedFee);
                assert.strictEqual(logExited.args.refundWeis.toNumber(), 0);
                
                let collected = await operator.getCollectedFeesAmount();
                let operatorBalance = await web3.eth.getBalancePromise(operator.address);                
                let vehicle1Balance = await web3.eth.getBalancePromise(vehicle1);

                assert.strictEqual(collected.toNumber(), expectedFee);
                assert.strictEqual(operatorBalance.toNumber(), expectedFee);
                assert.strictEqual(vehicle1Balance.toNumber(), vehicle1BalanceInitial.toNumber());
                
            });

            it("Scenario 3 - vehicle deposits more than the route price", async () => {

                let expectedFee = basePrice3 * multiplier1;
                let expectedReturn = actualDeposit1 - expectedFee;

                await operator.setRoutePrice(booth1, booth2, basePrice3, { from: operatorOwner });

                let tx = await operator.reportExitRoad(secret, { from: booth2 });
                totalGas += tx.receipt.gasUsed;
                
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logExited = tx.logs[0];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth2);
                assert.strictEqual(logExited.args.exitSecretHashed, hashedSecret);
                assert.strictEqual(logExited.args.finalFee.toNumber(), expectedFee);
                assert.strictEqual(logExited.args.refundWeis.toNumber(), expectedReturn);
                
                let collected = await operator.getCollectedFeesAmount();
                let operatorBalance = await web3.eth.getBalancePromise(operator.address);                
                let vehicle1Balance = await web3.eth.getBalancePromise(vehicle1);

                assert.strictEqual(collected.toNumber(), expectedFee);
                assert.strictEqual(operatorBalance.toNumber(), expectedFee);
                assert.strictEqual(vehicle1Balance.toNumber(), vehicle1BalanceInitial.toNumber() + expectedReturn);
                
            });

        });

        describe("Scenario 4 prepare", async () => {

            beforeEach("should enter road", async () => {
                await operator.setRoutePrice(booth1, booth2, basePrice1, { from: operatorOwner });
                await operator.enterRoad(booth1, hashedSecret, { from: vehicle1, value: actualDeposit2 });
                vehicle1BalanceInitial = await web3.eth.getBalancePromise(vehicle1);
            });

            it("Scenario 4 - vehicle deposits more than the required deposit", async () => {

                let expectedFee = basePrice1 * multiplier1;
                let expectedReturn = actualDeposit2 - expectedFee;

                let tx = await operator.reportExitRoad(secret, { from: booth2 });
                totalGas += tx.receipt.gasUsed;
                
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logExited = tx.logs[0];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth2);
                assert.strictEqual(logExited.args.exitSecretHashed, hashedSecret);
                assert.strictEqual(logExited.args.finalFee.toNumber(), expectedFee);
                assert.strictEqual(logExited.args.refundWeis.toNumber(), expectedReturn);
                
                let collected = await operator.getCollectedFeesAmount();
                let operatorBalance = await web3.eth.getBalancePromise(operator.address);                
                let vehicle1Balance = await web3.eth.getBalancePromise(vehicle1);
                
                console.log("finalFee: " + logExited.args.finalFee.toNumber());
                console.log("refundWeis: " + logExited.args.refundWeis.toNumber());
                console.log("collected: " + collected.toNumber());
                console.log("operatorBalance: " + operatorBalance.toNumber());

                assert.strictEqual(collected.toNumber(), expectedFee);
                assert.strictEqual(operatorBalance.toNumber(), expectedFee);
                assert.strictEqual(vehicle1Balance.toNumber(), vehicle1BalanceInitial.toNumber() + expectedReturn);
                
            });
            
        });

        describe("Scenario 5 prepare", async () => {

            beforeEach("should enter road", async () => {
                await operator.enterRoad(booth1, hashedSecret, { from: vehicle1, value: actualDeposit2 });
                vehicle1BalanceInitial = await web3.eth.getBalancePromise(vehicle1);
            });

            it("Scenario 5 - route unknown at the time vehicle gets to the exit booth", async () => {

                let expectedFee = basePrice4 * multiplier1;
                let expectedReturn = actualDeposit2 - expectedFee;

                let tx = await operator.reportExitRoad(secret, { from: booth2 });
                totalGas += tx.receipt.gasUsed;

                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logPending = tx.logs[0];
                assert.strictEqual(logPending.event, "LogPendingPayment");
                assert.strictEqual(logPending.args.exitSecretHashed, hashedSecret);
                assert.strictEqual(logPending.args.entryBooth, booth1);
                assert.strictEqual(logPending.args.exitBooth, booth2);

                let tx2 = await operator.setRoutePrice(booth1, booth2, basePrice4, { from: operatorOwner });
                totalGas += tx2.receipt.gasUsed;
                
                assert.strictEqual(tx2.receipt.logs.length, 2);
                assert.strictEqual(tx2.logs.length, 2);
                const logPriceSet = tx2.logs[0];
                assert.strictEqual(logPriceSet.event, "LogRoutePriceSet");
                assert.strictEqual(logPriceSet.args.sender, operatorOwner);
                assert.strictEqual(logPriceSet.args.entryBooth, booth1);
                assert.strictEqual(logPriceSet.args.exitBooth, booth2);
                assert.strictEqual(logPriceSet.args.priceWeis.toNumber(), basePrice4);
                const logExited = tx2.logs[1];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth2);
                assert.strictEqual(logExited.args.exitSecretHashed, hashedSecret);
                assert.strictEqual(logExited.args.finalFee.toNumber(), expectedFee);
                assert.strictEqual(logExited.args.refundWeis.toNumber(), expectedReturn);
                
                let collected = await operator.getCollectedFeesAmount();
                let operatorBalance = await web3.eth.getBalancePromise(operator.address);                
                let vehicle1Balance = await web3.eth.getBalancePromise(vehicle1);

                assert.strictEqual(collected.toNumber(), expectedFee);
                assert.strictEqual(operatorBalance.toNumber(), expectedFee);
                assert.strictEqual(vehicle1Balance.toNumber(), vehicle1BalanceInitial.toNumber() + expectedReturn);
                
            });
            
        });

        describe("Scenario 6 prepare", async () => {

            beforeEach("should enter road", async () => {
                await operator.enterRoad(booth1, hashedSecret, { from: vehicle1, value: actualDeposit2 });
                await operator.enterRoad(booth1, hashedSecret2, { from: vehicle2, value: actualDeposit3 });
                vehicle1BalanceInitial = await web3.eth.getBalancePromise(vehicle1);
                vehicle2BalanceInitial = await web3.eth.getBalancePromise(vehicle2);
            });

            it("scenario 6", async () => {

                let expectedFee = basePrice3 * multiplier1; //6
                let expectedReturn = actualDeposit2 - expectedFee; //8
                let expectedFee2 = basePrice3 * multiplier2; //6
                let expectedReturn2 = actualDeposit3 - expectedFee2; //4;

                let tx = await operator.reportExitRoad(secret, { from: booth2 });
                totalGas += tx.receipt.gasUsed;
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logPending = tx.logs[0];
                assert.strictEqual(logPending.event, "LogPendingPayment");
                assert.strictEqual(logPending.args.exitSecretHashed, hashedSecret);
                assert.strictEqual(logPending.args.entryBooth, booth1);
                assert.strictEqual(logPending.args.exitBooth, booth2);

                let tx2 = await operator.reportExitRoad(secret2, { from: booth2 });
                totalGas += tx2.receipt.gasUsed;
                assert.strictEqual(tx2.receipt.logs.length, 1);
                assert.strictEqual(tx2.logs.length, 1);
                const logPending2 = tx2.logs[0];
                assert.strictEqual(logPending2.event, "LogPendingPayment");
                assert.strictEqual(logPending2.args.exitSecretHashed, hashedSecret2);
                assert.strictEqual(logPending2.args.entryBooth, booth1);
                assert.strictEqual(logPending2.args.exitBooth, booth2);

                let tx3 = await operator.setRoutePrice(booth1, booth2, basePrice3, { from: operatorOwner });
                totalGas += tx3.receipt.gasUsed;                
                assert.strictEqual(tx3.receipt.logs.length, 2);
                assert.strictEqual(tx3.logs.length, 2);
                const logPriceSet = tx3.logs[0];
                assert.strictEqual(logPriceSet.event, "LogRoutePriceSet");
                assert.strictEqual(logPriceSet.args.sender, operatorOwner);
                assert.strictEqual(logPriceSet.args.entryBooth, booth1);
                assert.strictEqual(logPriceSet.args.exitBooth, booth2);
                assert.strictEqual(logPriceSet.args.priceWeis.toNumber(), basePrice3);
                const logExited = tx3.logs[1];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth2);
                assert.strictEqual(logExited.args.exitSecretHashed, hashedSecret);
                assert.strictEqual(logExited.args.finalFee.toNumber(), expectedFee);
                assert.strictEqual(logExited.args.refundWeis.toNumber(), expectedReturn);                
                let collected = await operator.getCollectedFeesAmount();               
                let vehicle1Balance = await web3.eth.getBalancePromise(vehicle1);
                assert.strictEqual(collected.toNumber(), expectedFee);
                assert.strictEqual(vehicle1Balance.toNumber(), vehicle1BalanceInitial.toNumber() + expectedReturn);

                let tx4 = await operator.clearSomePendingPayments(booth1, booth2, 1, { from: operatorOwner });
                totalGas += tx4.receipt.gasUsed;
                assert.strictEqual(tx4.receipt.logs.length, 1);
                assert.strictEqual(tx4.logs.length, 1);
                const logExited2 = tx4.logs[0];
                assert.strictEqual(logExited2.event, "LogRoadExited");
                assert.strictEqual(logExited2.args.exitBooth, booth2);
                assert.strictEqual(logExited2.args.exitSecretHashed, hashedSecret2);
                assert.strictEqual(logExited2.args.finalFee.toNumber(), expectedFee2);
                assert.strictEqual(logExited2.args.refundWeis.toNumber(), expectedReturn2);                
                let collected2 = await operator.getCollectedFeesAmount();
                let vehicle2Balance = await web3.eth.getBalancePromise(vehicle2);
                assert.strictEqual(collected2.toNumber(), expectedFee+expectedFee2);
                assert.strictEqual(vehicle2Balance.toNumber(), vehicle2BalanceInitial.toNumber() + expectedReturn2);                
                
            });
            
        });

    });

    describe("output total gas", function() {
        it("should output total gas", async () => {
            console.log("total gas: " + parseInt(totalGas/1000));
        });
    });
    

});
