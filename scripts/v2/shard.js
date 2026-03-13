"use strict";

const {
  RECORD_SIZE_BYTES,
  SHARD_TARGET_BYTES,
  assertFamilyId,
  assertInvariant,
  failClosed,
} = require("./constants");
const { sha256Hex } = require("./hash");

function assertContiguousShardIndexes(shards, familyId) {
  assertFamilyId(familyId);
  assertInvariant(Array.isArray(shards), `Invalid ${familyId} shards: expected array.`);

  for (let index = 0; index < shards.length; index++) {
    const shard = shards[index];
    assertInvariant(shard.index === index, "Shard indexes must be contiguous and 0-based.", {
      family_id: familyId,
      expected_index: index,
      actual_index: shard.index,
    });
  }
}

function shardFamilyStream(streamBytes, familyId, targetBytes = SHARD_TARGET_BYTES) {
  assertFamilyId(familyId);
  assertInvariant(Buffer.isBuffer(streamBytes), `Invalid ${familyId} stream: expected Buffer.`);
  assertInvariant(
    Number.isInteger(targetBytes) && targetBytes > 0,
    "Invalid shard target size: expected positive integer.",
    { target_bytes: targetBytes }
  );

  if (streamBytes.length % RECORD_SIZE_BYTES !== 0) {
    failClosed("Cannot shard stream with incomplete record boundary.", {
      family_id: familyId,
      stream_length: streamBytes.length,
      record_size_bytes: RECORD_SIZE_BYTES,
    });
  }

  const shards = [];
  let offset = 0;
  let shardIndex = 0;

  while (offset < streamBytes.length) {
    const shardStart = offset;
    let shardLength = 0;

    while (offset < streamBytes.length) {
      const nextRecordLength = RECORD_SIZE_BYTES;

      if (shardLength === 0 || shardLength + nextRecordLength <= targetBytes) {
        shardLength += nextRecordLength;
        offset += nextRecordLength;
        continue;
      }

      break;
    }

    if (shardLength === 0) {
      failClosed("Sharder produced an empty shard, which is invalid.", {
        family_id: familyId,
        target_bytes: targetBytes,
      });
    }

    const bytes = streamBytes.subarray(shardStart, shardStart + shardLength);
    shards.push({
      index: shardIndex,
      byteLength: bytes.length,
      sha256: sha256Hex(bytes),
      bytes,
    });
    shardIndex += 1;
  }

  assertContiguousShardIndexes(shards, familyId);
  return shards;
}

module.exports = {
  assertContiguousShardIndexes,
  shardFamilyStream,
};