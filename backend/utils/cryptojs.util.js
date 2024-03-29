const crypto = require("crypto-js");

const encrypt = async function (data) {
  // If the environment is development, return the data as is
  if (process.env.NODE_ENV === "development") return data;
  //   If the environment is production, encrypt the data using the SECRET environment variable
  if (process.env.NODE_ENV === "production") {
    const SECRET = process.env.SECRET;
    return await crypto.AES.encrypt(data, SECRET).toString();
  }
};

const decrypt = async function (data) {
  // If the environment is development, return the data as is
  if (process.env.NODE_ENV === "development") return data;
  //   If the environment is production, decrypt the data using the SECRET environment variable
  if (process.env.NODE_ENV === "production") {
    const SECRET = process.env.SECRET;
    return await crypto.AES.decrypt(data, SECRET).toString(crypto.enc.Utf8);
  }
};

module.exports = {
  encrypt,
  decrypt,
};
