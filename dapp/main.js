var web3 = new Web3(Web3.givenProvider);
var contractInstance;
$(document).ready(function() {
    window.ethereum.enable().then(function(accounts){
        contractInstance = new web3.eth.Contract(abi, "0xFc6Dc74B02f12eb222ac7E0665C01dF305F48841", {from: accounts[0]});
        console.log(contractInstance);
        $("#newbet").hide();
    });

    $("#bet").click(makeAbet);
    $("#withdraw").click(withdraw);
    $("#showbalance").click(balance);
    $("#withdrawbalance").click(withdrawbalance);
    $("#newbet").click(newBet);
    
    
});

async function makeAbet() {
    clean();

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

    handleEvents(blockNumber, queryId);

    /*contractInstance.once('LogRandomNumber',
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
                $("#bet").hide();
                $("#newbet").show();
            }
        }
    })*/

}

async function handleEvents(_newBlockNumber, _newQueryId) {
    contractInstance.once('LogRandomNumber',
    {
        filter: _newQueryId,
        fromBlock: _newBlockNumber,
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
        filter: _newQueryId,
        fromBlock: _newBlockNumber,
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
                $("#action").text("Draw! Please make a new choice");
                $("#bet").hide();
                $("#newbet").show();
            }
        }
    })
}

async function newBet() {
    clean();
    let blockNumber;
    let queryId;
    let newbet = $("input[name=mybet]:checked").val();

    blockNumber = await web3.eth.getBlockNumber();

    contractInstance.methods.newBet(newbet).send()
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
            if (newbet == 0){
                choice = "rock";
            } 
            else if (newbet == 1){
                choice = "paper";
            } else {
                choice = "scissors";
            }
            $("#choice").text("Your choice is: " + choice);
        }
    })

    handleEvents(blockNumber, queryId);
    $("#bet").show();
    $("#newbet").hide();

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
        clean();
    })
}

function withdrawbalance() {
    contractInstance.methods.kill().send();
}

function clean() {
    $("#action").text("");
    $("#choice").text("");
    $("#result").text("");
}

