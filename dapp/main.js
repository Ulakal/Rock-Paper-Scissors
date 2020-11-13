var web3 = new Web3(Web3.givenProvider);
var contractInstance;
$(document).ready(function() {
    window.ethereum.enable().then(function(accounts){
        contractInstance = new web3.eth.Contract(abi, "0xBA90FE4FCBa00B78692c86389e3437310bb19Da2", {from: accounts[0]});
        console.log(contractInstance);
    });

    $("#bet").click(makeAbet);
    $("#withdraw").click(withdraw);
    $("#showbalance").click(balance);
    $("#withdrawbalance").click(withdrawbalance);
    
});

async function makeAbet() {
    $("#choice").text("");
    $("#result").text("");
    $("#action").text("");

    let blockNumber;
    let txHash;
    let queryId;
    let bet = $("input[name=mybet]:checked").val();
    let amount = $("#bet_input").val();
    let config = {
        value: web3.utils.toWei(amount, "ether")
    }
    console.log("My bet is: " + bet);
    console.log("Bet value is: " + amount);

    blockNumber = await web3.eth.getBlockNumber();

    contractInstance.methods.bet(bet).send(config)
    .on('transactionHash', async function(TransactionHash){
        txHash = TransactionHash;
        console.log(txHash);
        $("#action").text("Wait for your transaction to be confirmed");
    })
    .on('receipt', async function(receipt){
        console.log(receipt);
        queryId = receipt.events.LogQueryId.returnValues.queryId;
        console.log(queryId);   
    })
    .on('confirmation', async function(confirmationNr){
        if(confirmationNr == 0) {
            $("#action").text("Transaction confirmed wait for the result");
            var choice;
            if (bet == 0){
                choice = "rock";
            } 
            else if (bet == 1){
                choice = "paper";
            } else {
                choice = "scissors";
            }
            $("#choice").text("Your choice is: " + choice);
        }
    })

    contractInstance.once('LogRandomNumber',
    {
        filter: queryId,
        fromBlock: blockNumber,
        toBlock: 'latest'
    }, function(error, event){
        console.log(event.returnValues);
        var randomNumber = event.returnValues.number;
        var randomChoice;
        if (randomNumber == 0) {randomChoice = "rock";}
        else if (randomNumber == 1) {randomChoice = "paper";}
        else {randomChoice = "scissors";}
        $("#result").text("Game choice is: " + randomChoice);
    })

    contractInstance.once('ResultOfTheGame', 
    {
        filter: queryId,
        fromBlock: blockNumber,
        toBlock: 'latest'
    }, function(error, event){
        if (event != undefined) {
            if (event.returnValues.description === "won") {
                console.log(event.returnValues);
                var prize = event.returnValues.prize;
                prize = web3.utils.fromWei(prize, "ether");
                $("#action").text("You won! Your prize is: " + prize + ". Please withdraw the prize!");
            } else if(event.returnValues.description === "lost") {
                console.log(event.returnValues);
                $("#action").text("You lost the bet. Try next time...");
            } else {
                console.log(event.returnValues);
                $("#action").text("Draw! wait for new lottery drawing");
            }
        }
    })

}

function balance() {
    web3.eth.getBalance(contractInstance.options.address).then(function(res){
        let balance = web3.utils.fromWei(res, "ether");
        $("#balance").text(balance);
    })
}

function withdraw() {
    contractInstance.methods.withdrawBalance().send()
    .on('error', function(error){
        $("#action").text("You didn't win any prize");
    })
    .on('transactionHash', function(transactionHash){
        $("#action").text("");
        $("#choice").text("");
        $("#result").text("");
    })
}

function withdrawbalance() {
    contractInstance.methods.kill().send();
}

