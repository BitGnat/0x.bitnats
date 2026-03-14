"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const { decodeBinaryRecord, encodeFamilyStream, encodeLogicalRecord } = require("../scripts/v2/binary");
const { reconstructJsonlBufferFromRecords, reconstructJsonlBufferFromStream } = require("../scripts/v2/jsonl");
const { parseV1JsonlText } = require("../scripts/v2/parse_v1_jsonl");
const { parseV1Id } = require("../scripts/v2/record");
const { shardFamilyStream } = require("../scripts/v2/shard");
const { sortFamilyRecordsCanonical } = require("../scripts/v2/sort");
const { sha256Hex } = require("../scripts/v2/hash");

const { REPO_ROOT, readJsonFile } = require("./helpers/test_utils");

function readVector(relativePath) {
  return readJsonFile(path.join(REPO_ROOT, relativePath));
}

test("docs synthetic vector roundtrip and hash commitments", () => {
  const vector = readVector("spec/vectors/docs-synthetic-two-records.json");
  const records = vector.records.map((entry) => parseV1Id(entry.id));

  for (let index = 0; index < records.length; index++) {
    const encoded = encodeLogicalRecord(records[index]);
    assert.equal(encoded.toString("hex"), vector.records[index].expected_record_hex);

    const decoded = decodeBinaryRecord(encoded);
    assert.equal(decoded.id, records[index].id);
  }

  const stream = Buffer.concat(records.map((record) => encodeLogicalRecord(record)), records.length * 33);
  const reconstructed = reconstructJsonlBufferFromRecords(records);

  assert.equal(sha256Hex(stream), vector.expected_stream_sha256);
  assert.equal(sha256Hex(reconstructed), vector.expected_reconstructed_jsonl_sha256);
  assert.equal(
    reconstructed.toString("utf8"),
    vector.expected_reconstructed_jsonl_lines.join("\n") + "\n"
  );
});

test("dataset-derived base sample vector is stable", () => {
  const vector = readVector("spec/vectors/dataset-derived-base-sample-16.json");

  const sourceText = fs.readFileSync(path.join(REPO_ROOT, vector.source_jsonl), "utf8");
  const selectedLines = sourceText
    .split("\n")
    .filter((line) => line.length > 0)
    .slice(0, vector.record_count);
  const sampleText = `${selectedLines.join("\n")}\n`;

  const records = parseV1JsonlText(sampleText, vector.source_jsonl);
  const sorted = sortFamilyRecordsCanonical(records, "base");
  const stream = encodeFamilyStream(sorted, "base");
  const reconstructed = reconstructJsonlBufferFromStream(stream, "base");

  assert.equal(sorted.length, vector.record_count);
  assert.deepEqual(
    sorted.map((record) => record.id),
    vector.sorted_ids
  );
  assert.equal(sha256Hex(stream), vector.expected_stream_sha256);
  assert.equal(sha256Hex(reconstructed), vector.expected_reconstructed_jsonl_sha256);
});

test("shard boundary edge-case vectors are deterministic", () => {
  const vector = readVector("spec/vectors/shard-boundary-edge-cases.json");
  const records = vector.records.map((id) => parseV1Id(id));
  const stream = encodeFamilyStream(records, vector.family);

  for (const scenario of vector.cases) {
    const shards = shardFamilyStream(stream, vector.family, scenario.target_bytes);

    assert.deepEqual(
      shards.map((shard) => shard.byteLength),
      scenario.expected_shard_byte_lengths
    );
    assert.deepEqual(
      shards.map((shard) => shard.sha256),
      scenario.expected_shard_sha256
    );

    const reconstructedStream = Buffer.concat(
      shards.map((shard) => shard.bytes),
      shards.reduce((sum, shard) => sum + shard.byteLength, 0)
    );

    assert.equal(Buffer.compare(reconstructedStream, stream), 0);
  }
});
