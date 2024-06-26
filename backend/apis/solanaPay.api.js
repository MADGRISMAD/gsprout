const juegoService = require("../services/juego.service.js");
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { encodeURL, validateTransfer, findReference } = require("@solana/pay");
const BigNumber = require("bignumber.js");
const { CONNECTION } = require("./umi.api.js");
const { getExchange } = require("../utils/exchange.util.js");
// CONSTANTS
const destinyWallet = process.env.WALLET;
const recipient = new PublicKey(destinyWallet);
const label = "Compra de producto";
// const memo = "GSprout Demo public memo";
// const amount = new BigNumber(0.1); // 0.1 SOL
const paymentRequests = new Map();
const connection = CONNECTION;

// BUYER WALLET
// const privateKey =
//   "2BsEwrvnu7sQg8RkY8tUUcjG3G9cZ6NM8YaJ2zKuBQLmu3x62UtV94WDZdDxSXX8FGxgsW2znPoiXaF8tgUNJx4k";
// const privateKeyBytes = base58.decode(privateKey);
// const keypair = Keypair.fromSecretKey(privateKeyBytes);
// const publicKey = "9m5TqpsHkPmTYz5aRraLd1ntTtAaLuWuXcMCsRpuvjg8"
// const metaplexUtil = require("../utils/metaplex.util.js");

const generatePayment = async (req, res) => {
  /*
  This function will generate a payment request for the user
  Will use the juego id to get the juego and the price
  Will generate a payment request and return the url
  */

  const juego = await juegoService.getJuegoById(req.params.id);
  if (!juego) {
    return res.status(404).send("Juego not found");
  }
  const exchange = await getExchange();
  const amount = new BigNumber((juego.precio / exchange.buy).toFixed(9));
  const message = juego.nombre;
  const reference = new Keypair().publicKey;
  const memo = reference.toBase58();
  try {
    const urlData = await generateUrl(
      recipient,
      reference,
      label,
      message,
      memo,
      amount
    );
    const ref = reference.toBase58();
    paymentRequests.set(ref, {
      recipient,
      amount,
      memo,
      juego: juego,
    });
    const { url } = urlData;
    return res.status(200).send({ url: url.toString(), ref });
  } catch (error) {
    return res.status(500).send("Internal Server Error");
  }
};

const verifyPayment = async (req, res, next) => {
  /*
  This function will verify the payment
  Will use the reference to get the payment data
  Will verify the payment and continue with the next middleware
  */
  const reference = req.params.reference;
  if (!reference) {
    res.status(400).send("Missing reference query parameter");
    return;
  }

  try {
    // IMPORTANT
    // Set the id in the response locals to use it in the next middleware
    const referencePublicKey = new PublicKey(reference.toString());
    res.locals.juego = paymentRequests.get(reference).juego;
    const response = await verifyTransaction(referencePublicKey);
    if (response) {
      res.locals.buyerKey = response.transaction.message.accountKeys[0];
      res.send("Payment verified").status(200);
      next();
    } else {
      return res.status(400).send("Payment not verified");
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal Server Error");
  }
};

async function generateUrl(recipient, reference, label, message, memo, amount) {
  let url;
  url = encodeURL({
    recipient,
    amount,
    reference,
    label,
    message,
    memo,
  });

  return { url };
}
const verifyTransaction = async (reference) => {
  /*
  This function will verify the transaction
  Will use the reference to get the payment data
  Will verify the transaction and return the result
  */
  const paymentData = paymentRequests.get(reference.toBase58());
  if (!paymentData) {
    return false;
  }

  const { recipient, amount, memo, id } = paymentData;

  // Devnet connection
  const found = await findReference(connection, reference); // Problema aqui: la referencia no se encuentra
  const response = await validateTransfer(
    connection,
    found.signature,
    {
      recipient,
      amount,
      splToken: undefined,
      reference,
      memo,
    },
    { commitment: "confirmed" }
  );
  if (response) {
    paymentRequests.delete(reference.toBase58());
    return response;
  }
};
module.exports = {
  verifyPayment,
  generatePayment,
};
