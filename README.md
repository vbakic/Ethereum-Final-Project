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