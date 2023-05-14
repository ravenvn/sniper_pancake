const Web3 = require("web3");
const axios = require("axios");
const ID_TELEGRAM = require("./ID_TELEGRAM.json");
const TelegramBot = require("node-telegram-bot-api");

const PROCESS_ID = 4;
const web3 = new Web3("https://bsc-dataseed1.defibit.io/");
const pancakeRouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

var FLAG_GET_TRANSACTION = false;
//send telegram bot
const tokenTelegramBot = "5856262019:AAGkpUS8tZWcMf5nl19iUzsMHL8mPySJZQo";

const botTelegram = new TelegramBot(tokenTelegramBot, {
  polling: false,
  parse_mode: "Markdown",
});

const sendMessage = async (decodedData) => {
  try {
    let pool = Number(
      Web3.utils.fromWei(decodedData["amountETHMin"], "ether")
    ).toFixed(2);
    let date = new Date().toUTCString();
    let body = `
🟢<b className="">${pool} BNB</b> Address: <a href="https://bscscan.com/address/${decodedData.token}#readContract" className="">${decodedData.token}</a> 

✅Add Liquid: <b className="">${pool} BNB</b>

👤Owner: <a href="https://bscscan.com/address/${decodedData.to}" className="">${decodedData.to}</a> 

💹<a href="https://pancakeswap.finance/swap?outputCurrency=${decodedData.token}" className="">Buy on Pancake</a> 

🌐<a href="https://poocoin.app/tokens/${decodedData.token}" className="">Chart on PooCoin</a> 

🕐Time on: ${date}
    `;
    ID_TELEGRAM.forEach(async (id) => {
      await botTelegram.sendMessage(id, body, { parse_mode: "HTML" });
    });
  } catch (e) {
    console.log("Send message error");
  }
};

// check data router pancake

async function decodeInputData(txHash) {
  try {
    const transaction = await web3.eth.getTransaction(txHash);
    const inputData = transaction.input;
    let inputTypes = [
      { internalType: "address", name: "token", type: "address" },
      {
        internalType: "uint256",
        name: "amountTokenDesired",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountTokenMin",
        type: "uint256",
      },
      { internalType: "uint256", name: "amountETHMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ];

    const decodedData = web3.eth.abi.decodeParameters(
      inputTypes,
      inputData.slice(10)
    );
    let pool = Web3.utils.fromWei(decodedData["amountETHMin"], "ether");
    if (pool > 5 && pool < 1000) {
      console.log(txHash);
      sendMessage(decodedData);
    }
  } catch (error) {
    //console.error("Error: decodeInputData");
  }
}

async function getTransactionInBlock(blockNumber, transactionIndex) {
  try {
    const block = await web3.eth.getBlock(blockNumber);
    if (block) {
      const transactionHash = block.transactions[transactionIndex];
      const transaction = await web3.eth.getTransaction(transactionHash);
      if (transaction.to.toLowerCase() == pancakeRouterAddress.toLowerCase()) {
        decodeInputData(transaction.hash);
      }
    }
  } catch (error) {
    FLAG_GET_TRANSACTION = false;
    console.error("Error: getTransactionInBlock");
  }
}

var blockPending = [];
function getLastBlock() {
  setInterval(async () => {
    try {
      var lastBlock = await web3.eth.getBlockNumber();
      console.log("getBlockNumber");
      if (lastBlock % 9 == PROCESS_ID && !blockPending.includes(lastBlock)) {
        blockPending.push(lastBlock);
        console.log(blockPending);
      }
    } catch (e) {
      console.log(e);
    }
  }, 10000);
}

async function initApp() {
  var i = 0;
  var lastBlock = 0;
  while (true) {
    try {
      if (FLAG_GET_TRANSACTION) {
        await getTransactionInBlock(lastBlock, i);
        i++;
      } else {
        i = 0;
        let block = await web3.eth.getBlockNumber();
        if (lastBlock != block - (block % 9) + PROCESS_ID) {
          lastBlock = block - (block % 9) + PROCESS_ID;
          FLAG_GET_TRANSACTION = true;
          console.log(lastBlock);
        }
      }
    } catch (e) {
      console.log(e);
    }
  }
}

try {
  initApp();
} catch (e) {
  console.error("Unhandled error", error);
}
