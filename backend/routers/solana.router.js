const router = require('express').Router();
const solanaPay = require('../apis/solanaPay.api.js');
const { mintNFT } = require('../components/nft.component.js');
const { generateLicense } = require('../middleware/license.middleware.js');
const multer = require('multer');
const upload = multer();
router.get('/:reference', upload.none(), solanaPay.verifyPayment, generateLicense, mintNFT);
router.post('/:id', upload.none(), solanaPay.generatePayment);

module.exports = router;