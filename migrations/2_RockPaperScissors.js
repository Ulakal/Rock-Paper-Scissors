const RockPaperScissors = artifacts.require("RockPaperScissors");

module.exports = function(deployer) {
  deployer.deploy(RockPaperScissors, {value: web3.utils.toWei("1", "ether")});
};