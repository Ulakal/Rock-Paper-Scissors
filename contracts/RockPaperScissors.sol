import "./Ownable.sol";
import "./provableAPI.sol";
pragma solidity >= 0.5.12;

contract RockPaperScissors is Ownable, usingProvable {

    //uint balance;
    uint256 constant NUM_RANDOM_BYTES_REQUESTED = 1
    ;
    struct Player {
        address addr;
        bytes32 id;
        uint bet;
        uint amount;
    }

    mapping (bytes32 => Player) players;
    mapping (address => bool) waitingList;
    mapping (bytes32 => bool) pendingQueries;
    mapping (address => uint256) balances;

    event LogNewProvableQuery(string description);
    event ProvableQueryProofVerify(string description);
    event LogQueryId(bytes32 queryId);
    event LogRandomNumber(uint number);
    event ResultOfTheGame(bytes32 indexed myid, string description, bool win, uint256 prize);

    //BET: 0 = "rock"
    //     1 = "paper"
    //     2 = "scissors" 

    constructor() public payable {
        //balance = msg.value;
        provable_setProof(proofType_Ledger);
    }

    function bet(uint _bet) public payable {
        require(msg.value >= 0.1 ether, "bet must be higher than 0.1 ether");
        require(msg.value <= address(this).balance, "bet can't be higher than balance of dapp");
        require(waitingList[msg.sender] == false);
        
        //sending a query for random number
        bytes32 queryId = queryRandomNumber();
        emit LogQueryId(queryId);

        //setting a new bet
        Player memory newPlayer;
        newPlayer.addr = msg.sender;
        newPlayer.id = queryId;
        newPlayer.bet = _bet;
        newPlayer.amount = msg.value;

        players[queryId] = newPlayer;
    } 

    function queryRandomNumber() private returns(bytes32) {
        uint256 QUERY_EXECUTION_DELAY = 0;
        uint256 GAS_FOR_CALLBACK = 600000;
        bytes32 _queryId = provable_newRandomDSQuery(
            QUERY_EXECUTION_DELAY,
            NUM_RANDOM_BYTES_REQUESTED,
            GAS_FOR_CALLBACK
            );
        pendingQueries[_queryId] = true;
        emit LogNewProvableQuery("Provable query was sent, standing by for the answer...");
        return _queryId;
    }

    function __callback(bytes32 _myid, string memory _result, bytes memory _proof) public {
        require (msg.sender == provable_cbAddress());
        require (pendingQueries[_myid] == true);
        if (provable_randomDS_proofVerify__returnCode(_myid, _result, _proof) != 0) {
            emit ProvableQueryProofVerify("The proof verification has failed!");
        } else {
            uint randomNumber = uint256(keccak256(abi.encodePacked(_result)))%3;
            _verifyResult(_myid, randomNumber);
            emit LogRandomNumber(randomNumber);
        }  
    }

    function _verifyResult(bytes32 id, uint256 randomNumber) private {
        //player wins
        if ((players[id].bet == 0 && randomNumber == 2) 
        || (players[id].bet == 1 && randomNumber == 0)
        || (players[id].bet == 2 && randomNumber == 1)) {
            balances[players[id].addr] = 2*players[id].amount;
            emit  ResultOfTheGame(id, "won", true, balances[players[id].addr]);
        }
        //player looses
        else if ((players[id].bet == 0 && randomNumber == 1) 
        || (players[id].bet == 1 && randomNumber == 2)
        || (players[id].bet == 2 && randomNumber == 0)) {
            emit  ResultOfTheGame(id, "lost", false, balances[players[id].addr]);    
        }
        //remis
        else {
            //play another game
            queryRandomNumber();
            emit  ResultOfTheGame(id, "draw", false, balances[players[id].addr]);
        }
        
        delete pendingQueries[id];
        delete players[id];
    }

    //function newBet(uint256 _newbet) public {

    //}

    function withdrawBalance () external returns(uint256) {
        require(balances[msg.sender] > 0);
        uint256 toTransfer = balances[msg.sender];

        delete balances[msg.sender];
        delete waitingList[msg.sender];
        msg.sender.transfer(toTransfer);
        assert(balances[msg.sender] == 0);
       
        return toTransfer;
    }

    function kill() public onlyOwner() {
        selfdestruct(msg.sender);
    }
}