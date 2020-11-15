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
    mapping (address => bytes32) IDs;
    mapping (address => bool) waitingList;
    mapping (bytes32 => bool) pendingQueries;
    mapping (address => bool) win;

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

    function bet(uint mybet) public payable {
        require(msg.value >= 0.1 ether, "bet must be higher than 0.1 ether");
        require(msg.value <= address(this).balance, "bet can't be higher than balance of dapp");
        require(waitingList[msg.sender] == false);
        require(win[msg.sender] == false, "previous prize not withdrawn");
        
        waitingList[msg.sender] = true;
        setAbet(msg.sender, mybet, msg.value);
    } 

    function setAbet(address _player, uint _mybet, uint _value) private {
        //sending a query for random number
        bytes32 queryId = queryRandomNumber();

        //setting a new bet
        Player memory newPlayer;
        newPlayer.addr = _player;
        newPlayer.id = queryId;
        newPlayer.bet = _mybet;
        newPlayer.amount = _value;

        players[queryId] = newPlayer;
        IDs[_player] = queryId;
        
        emit LogQueryId(queryId);
    }

    function queryRandomNumber() private returns(bytes32) {
        uint256 QUERY_EXECUTION_DELAY = 0;
        uint256 GAS_FOR_CALLBACK = 200000;
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
            waitingList[players[_myid].addr] = false;
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
            uint prize = 2*players[id].amount;
            win[players[id].addr] = true;
            //balances[players[id].addr] = 2*players[id].amount;
            delete waitingList[players[id].addr];
            emit  ResultOfTheGame(id, "won", true, prize);
        }
        //player looses
        else if ((players[id].bet == 0 && randomNumber == 1) 
        || (players[id].bet == 1 && randomNumber == 2)
        || (players[id].bet == 2 && randomNumber == 0)) {
            delete waitingList[players[id].addr];
            delete players[id];
            emit  ResultOfTheGame(id, "lost", false, 0);    
        }
        //draw
        else {
            //play another game, action in frontend, newBet()
            //balances[players[id].addr] = players[id].amount;
            emit  ResultOfTheGame(id, "draw", false, 0);
        }
        
        delete pendingQueries[id];
    }

    function newBet(uint256 _newBet) public {
        require(waitingList[msg.sender] == true);

        setAbet(msg.sender, _newBet, players[IDs[msg.sender]].amount);
    }

    function withdrawBalance () external returns(uint256) {
        //require(balances[msg.sender] > 0);
        require(win[msg.sender] == true);
        uint256 toTransfer = 2*players[IDs[msg.sender]].amount;

        delete win[msg.sender];
        delete players[IDs[msg.sender]];
        msg.sender.transfer(toTransfer);
        //assert(balances[msg.sender] == 0);
        assert(players[IDs[msg.sender]].amount == 0);
       
        return toTransfer;
    }

    function kill() public onlyOwner() {
        selfdestruct(msg.sender);
    }
}