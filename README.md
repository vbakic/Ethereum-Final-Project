# Final Project Readme

## Modules installation

I've updated package.json file to contain `assert-plus` and `babel-polyfill` node modules. Running `npm i` should be enough to setup all required node modules and all the versions should be the same as in the `exam-step-2` repo.

* All of unit tests should pass, including scenarios.js, by running `truffle test` command. There should be 176 tests in total and all of them should pass. I tested all of them in Vagrant box.

### Truffle Migration

To succesfully deploy `Regulator` and `TollBoothOperator` instances, ganache should be executed via (I don't thing that `--allowUnlimitedContractSize` is actually required, but I kept using it right from the begining):
```sh
$ ganache-cli -l 15000000 --allowUnlimitedContractSize
```

`2_deploy_contracts.js` is the file for deploying those two contracts.

Unfortunately, I had issues with the requirements that `TollBoothOperator` should only be deployed by calling `createNewOperator` function on already deployed `Regulator` instance. This was giving me hard time, because if I deployed the `TollBoothOperator` that way, the truffle wouldn't "know" its existence, or at least I didn't know how to manage that.
It doesn't sound reasonable to copy/paste `TollBoothOperator` from the migration console output each time and paste it into code of the GUI application and use the contract off that address. Instead, I just used deployer to deploy `TollBoothOperator` and I did it in resumed state. In that case there was the same owner (the default account on the network, typicall the first) for both contract instances, which is not desirable, but I was running pretty close to the deadline, had to simplify things as I wasn't able to meet all requirements.

### GUI notes

For GUI I used simple webpack instance, it was already there in `exam-step-2` repository, I only needed a couple of minor adjustments. 

GUI should be run by executing `npm run dev` when positioned in `app` directory since that is where the webpack code is.

* I had issues with my Vagrant instance, the 8080 (or any other I tried) port was inaccessible on my host machine, thus (unfortunately) I wasn't able to confirm that GUI is working properly when served from Vagrant box. Because of that all GUI testing was done in my local enviroment. This makes me feel unconfortable at the very least.

* Furthermore, I had big problems calling `createNewOperator` from the GUI, even though it was working perfectly fine in `scenarios.js` file, it would just throw `revert` for some reason when called from GUI. Because of that I just used `TollBoothOperator` instance I deployed in truffle migration via `deployer.deploy()` function as I mentioned in truffle migration paragraph.