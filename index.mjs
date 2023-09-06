import 'websocket-polyfill'
import fetch from 'node-fetch';
import browserifyCipher from 'browserify-cipher'
import crypto from 'crypto'
import {
    relayInit,
    generatePrivateKey,
    getPublicKey,
    getEventHash,
    getSignature
  } from 'nostr-tools'
import qrcode from 'qrcode-terminal';

// -------------- CONSTANTS ------------

const KEY = 'f344437e7974eba2c9032d52e6cc069f1b95649ca8dde42c1111218a63820d1e';
const API_KEY = '905076ef992e42ebb67d07b275396718'
const LNBITS_API = '1c82bb8c6c974a898ff6ee2001906b58'
const LNURL = 'https://legend.lnbits.com/offlineshop/lnurl/cb/1529'
const URL = 'http://127.0.0.1/'

// {"pr":"lnbc10n1pj03x7usp5mty829v8jam5w5fc3u7qam9rly4cl0jncy4qvztu9kxz7rfd7muspp5qll5xwf75k7ccv5upyv9xwgn0s4lqjrxwqre4rm8nt4mdd9kaptshp5jneddgs85nr7lpryrvmtjr4syfjnmhz8jeng4q2z7r86tuc8lstqxqzjccqpjrzjq2a78rrz58pe63y7t7rqej2w86f48la98q3tzfgyj7hugpx06lq0qrpkr5qqswgqqqqqqqlgqqqqqysqvs9qxpqysgqk4jt200gjx9pjkel84cxd5r3t6rkyvvkkr5nr9fvews8ee7m6gzst9aeu5dwyczz47qgw8sg9wpdmhv4pexc4fh3f6kpst5lsfn2xegqvlwny2","successAction":{"tag":"url","url":"https://legend.lnbits.com/offlineshop/confirmation/07ff43393ea5bd8c329c09185339137c2bf0486670079a8f679aebb6b4b6e857","description":"Open to get the confirmation code for your purchase."},"routes":[]}

// -------------- HELPER FUNCTIONS ------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ----------- LIGHTNING FUNCTIONS ------------

async function createLightningInvoice(apiKey, amount, memo) {
  try {
    const url = 'https://legend.lnbits.com/api/v1/payments';
    const body = {
      out: false,
      amount,
      memo,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify(body)
    });

    if (response.status === 201) {
      const data = await response.json();

      return {
        pr: data.payment_request,
        hash: data.payment_hash,
        routes: [],
        successAction: {
          "tag": "url",
          "description": memo,
          "url": "https://www.ln-service.com/order/<orderId>"
        }
      }

    } else {
      console.log('Failed to create item:', response.statusText);
      return null;
    }

  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
    return null;
  }
}

// ----------- NOSTR FUNCTIONS --------------

async function createGatedNote(
  relay,
  pk,
  sk,
  lnurl,
  price,
  lockKey,
  letterCount,
  content,
){

  let gatedEvent = {
    kind: 750,
    pubkey: pk,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: encrypt(lockKey, content)
  }
  gatedEvent.id = getEventHash(gatedEvent)
  gatedEvent.sig = getSignature(gatedEvent, sk)

  let displayEvent = {
    kind: 1,
    pubkey: pk,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['e', gatedEvent.id ],
      ['lnurl', lnurl ],
      ['price', price.toString() ]
    ],
    content: content.substring(0, letterCount) + `... [ Pay ${price/1000} Sats to unlock ]`,
  }
  displayEvent.id = getEventHash(displayEvent)
  displayEvent.sig = getSignature(displayEvent, sk)

  console.log("Gated Note")
  console.log(gatedEvent.id);
  await relay.publish(gatedEvent);

  console.log("Display Note")
  console.log(displayEvent.id);
  await relay.publish(displayEvent);

  return [gatedEvent, displayEvent];

}


// --------------------- RUNTIME ---------------

console.log(await createLightningInvoice(
    LNBITS_API,
    1,
    "This is for one call of the Chat-GPT API",
    "https://chat.openai.com/"
))
  
//   const relay = relayInit('ws://127.0.0.1:8080')
//   relay.on('connect', () => {
//     console.log(`connected to ${relay.url}`)
//   })
//   relay.on('error', (e) => {

//     console.log(e)
//     console.log(`failed to connect to ${relay.url}`)
//   })
  
//   await relay.connect()

//   const sk = generatePrivateKey() // `sk` is a hex string
//   const pk = getPublicKey(sk) // `pk` is a hex string

//   const [gatedNote, displayNote] = await createGatedNote(
//     relay,
//     pk,
//     sk,
//     LNURL,
//     1000,
//     KEY,
//     30,
//     "This is a story about 3 little sheep. The first little sheep was fluffy, the second was naughty and the thrid was dead."
//   )

//   const partialNote = await relay.get({
//     ids: [
//       displayNote.id
//     ]
//   })

//   console.log("Partial Note");
//   console.log(partialNote.content);

//   const encryptedNoteID = findTagId(partialNote, 'e')
//   const lnurl = findTagId(partialNote, 'lnurl')
//   const price = findTagId(partialNote, 'price')

//   const response = await fetch(lnurl + "?amount=" + price);
//   const invoice = (await response.json())

//   qrcode.generate(invoice.pr, {small: true});
//   const decryptKey = await pollUntilOK(invoice.successAction.url, 500, 21 * 1000);

//   const fullNote = await relay.get({
//     ids: [
//       encryptedNoteID
//     ]
//   })

//   console.log("Full Note");
//   console.log(invoice.successAction.url);
//   console.log(decrypt(decryptKey, fullNote.content))


//   relay.close()

  