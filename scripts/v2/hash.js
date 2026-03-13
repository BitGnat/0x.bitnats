"use strict";

const crypto = require("crypto");

const { assertInvariant } = require("./constants");

function sha256Hex(bytes) {
  assertInvariant(Buffer.isBuffer(bytes), "Invalid hash input: expected Buffer.");
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

module.exports = {
  sha256Hex,
};