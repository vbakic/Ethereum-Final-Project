# Final Project Readme

## Modules installation

I've updated package.json file to contain `assert-plus` and `babel-polyfill` node modules. Running `npm i` should be enough to setup all required node modules and all the versions should be the same as in the `exam-step-2` repo.

## Truffle tests

* Before running tests, ganache should be started first:
  
```sh
$ ganache-cli -l 15000000 --allowUnlimitedContractSize
```

* All of unit tests should pass, including scenarios.js, by running `truffle test` command. There should be 175 tests in total. I tested all of them in Vagrant box.

### Truffle Migration

To succesfully deploy `Regulator` and `TollBoothOperator` instances, ganache should be executed as:
```sh
$ ganache-cli -l 15000000 -h 0.0.0.0
```
This takes care that limit for gas is raised above default and the address is 0.0.0.0 which is important when running the webpack from Vagrant VM, otherwise it won't be accessible in host OS.

`2_deploy_contracts.js` is the file for deploying those two contracts.

Due to requirements that we were supposed to deploy `Regulator` and then create new `TollBoothOperator` by calling `createNewOperator` function, only `Regulator` would be deployed via deployer; the `TollBoothOperator` address would be recorded in the event log of the `Regulator` and it would be used to instantiate the contract that exists on that address.

I chose second account for the `TollBoothOperator` owner. Since `TollBoothOperator` is created in paused state by default, I would run the `setPaused` function right after the creation.

### GUI notes

For GUI I used simple webpack instance, it was already there in `exam-step-2` repository, I only needed a couple of minor adjustments when it comes to paths and file names.

GUI should be run by executing `npm run dev` when positioned in `app` directory since that is where the webpack code is. The app can then be accessed on http://localhost:8000 URL.

Since `TollBoothOperator` is deployed unlike `Regulator`, where standard `.deployed()` function is used, I would read logs for `Regulator` specifically for the `LogTollBoothOperatorCreated` event and then use first ever `TollBoothOperator` address to instantiate it as truffle-contract instance using `.at()` function. The downside of it is that is really slow, it literally hangs the entire app for ~10 seconds. I've read that it is due to the fact that contract code is fetched and validated instead of simple `.deployed()`. It is allegedly fixed in newer truffle versions, but I haven't tried it personally.

The `Regulator` instance is fixed to the deployed one, thus it can only be one `Regulator` instance, but `Regulator` owner is free to create new `TollBoothOperator` instances and set their owner.

Any existing `TollBoothOperator` address can be loaded on `TollBoothOperator` page by entering its address and clicking `Load Operator from an address` button. When `TollBoothOperator` is loaded from an address, the the data from Vehicle Entries/Exits and Pending Payments logs would also be fetched and presented to a user. The data would be updated from then on with new rows as the new events happen.

There are two predefined vehicles and two Toll Booth addresses, for simplicity. I could have made them as inputs, which I did initially, but I figured the code was unnecessarily complex. You could test the app without entering any particular address, just the values for vehicle type, multiplier, deposit.

## Pros and cons of blockhain approach for Toll Road system

### Pros:

* The use of blockchain avoids the necessity of single point of failure - a centralized server/database that runs the Toll Road system app, or multiple centralized apps in the system

* The rules imposed within smart contracts cannot be changed - nobody could make anything unfair or compromise the system, unlike conventional application. Each relation within the system participants is set in stone, by the contract, as if two parties agree on a contract and always do what they agreed, forever.

* Running conventional system has its cost and possiblity of downtime - as opposed to the blockchain, where can't be any downtime as there will always be nodes running the EVM, as long there is any, the programs will run

* Everything in blockchain is transparent, all data is public - no one will ever want to try any foul play (except trying to hack the system via smart contract vulnerability) as system will make sure that's not possible

* Because every data is public, secrets that drivers/vehicles hold are a necessity, but at the same time create bigger safety - no one has to be trusted

* Smart contracts make sure that funds are properly transferred whomever they should be, without fee, without any bank as a third party. Funds are the integral part of the app, not some 3rd party service, it IS the app

* Everything could be replayed - the blockchain keeps the entire history of transactions

* No vehicle entry could ever be lost, unlike conventional system with single app/database, where a glitch in software can result in various data getting lost for good (despite backups)

* Ethereum Smart Contracts are elegant solution for toll road system:
If a vehicle entered the toll road, the only possible outcome is that it exits the toll road, which is inline with its smart contract implementation, it can't just disappear, as it could in conventional system due to some bug that causes it entry to get lost or overwritten for example. Etherum solution models the real life better than conventional system.

* With blockchain there is enormous potential to use it for all toll roads in the world - which is impossible with conventional systems as there are too many differences in regulations, each country has their own Toll Road Operator(s) and any Operator has their own database...

### Cons:

* The downside is that base deposit is required

* There are still items that have to be done off-chain - those items have to be part of the centralized app

* The throughput is usually lower than conventional system mostly to a need to confirm all transactions (mining), but also because it's not centralized and there is typically a latency between nodes

* The authority of Regulator and TollBoothOperator is equivalent of conventional system, 
but actually anyone could be Regulator/TollBoothOperator owner in case of blockchain

* Anyone could steal a private key and gain an access

* Any potential loophole in the contract is extremely high threat to the app, like the DAO exploit - because contracts are set in stone, a hard fork is the only 100% way to reverse malicious transactions, but that has to be agreed on the majority of network, not always possible
