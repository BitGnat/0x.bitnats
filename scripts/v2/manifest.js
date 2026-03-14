"use strict";

const fs = require("fs");
const path = require("path");

const {
  FORMAT_ID_V2,
  JSONL_SCHEMA_ID,
  MANIFEST_VERSION_V2,
  RECORD_SIZE_BYTES,
  SHARD_TARGET_BYTES,
  SUPPORTED_FAMILIES,
  assertFamilyId,
  assertInvariant,
  failClosed,
} = require("./constants");
const { sha256Hex } = require("./hash");
const {
  FAMILY_SHARDS_DIRNAME,
  getFamilyShardsDir,
  getFamilyStreamPath,
  getShardFileName,
} = require("./paths");
const { reconstructJsonlBufferFromStream } = require("./jsonl");
const { assertContiguousShardIndexes } = require("./shard");

const SHARD_FILENAME_PATTERN = /^shard-(\d{6})\.bin$/;
const INSCRIPTION_ID_PATTERN = /^([0-9a-f]{64})i(0|[1-9][0-9]*)$/;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const SHARD_INSCRIPTION_MAPPING_VERSION = 1;
const SHARD_MAPPING_REQUIRED_KEYS = ["mapping_version", "families"];
const SHARD_MAPPING_ENTRY_REQUIRED_KEYS = ["index", "shard_file", "inscription_id"];

const EMPTY_SHA256 = sha256Hex(Buffer.alloc(0));

const TOP_LEVEL_REQUIRED_KEYS = [
  "manifest_version",
  "format_id",
  "record_size_bytes",
  "shard_target_bytes",
  "families",
];
const TOP_LEVEL_OPTIONAL_KEYS = ["compatibility"];
const FAMILY_REQUIRED_KEYS = [
  "family_id",
  "stream_hash_sha256",
  "reconstructed_jsonl_hash_sha256",
  "jsonl_schema",
  "shards",
];
const SHARD_REQUIRED_KEYS = ["index", "inscription_id", "byte_length", "sha256"];

function assertPlainObject(value, contextLabel) {
  assertInvariant(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `Invalid ${contextLabel}: expected object.`
  );
}

function assertExactKeys(value, requiredKeys, optionalKeys, contextLabel) {
  assertPlainObject(value, contextLabel);

  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  const keys = Object.keys(value);
  const missingKeys = requiredKeys.filter((key) => !Object.prototype.hasOwnProperty.call(value, key));
  const extraKeys = keys.filter((key) => !allowedKeys.has(key));

  assertInvariant(missingKeys.length === 0, `Invalid ${contextLabel}: missing required field(s).`, {
    context: contextLabel,
    missing_fields: missingKeys,
  });

  assertInvariant(extraKeys.length === 0, `Invalid ${contextLabel}: unexpected field(s).`, {
    context: contextLabel,
    extra_fields: extraKeys,
  });
}

function assertLowercaseSha256(value, contextLabel) {
  assertInvariant(typeof value === "string" && SHA256_HEX_PATTERN.test(value), `Invalid ${contextLabel}: expected lowercase SHA-256 hex.`, {
    value,
  });

  return value;
}

function assertCanonicalInscriptionId(value, contextLabel) {
  assertInvariant(
    typeof value === "string" && INSCRIPTION_ID_PATTERN.test(value),
    `Invalid ${contextLabel}: expected canonical <txid>i<index> text.`,
    { value }
  );

  return value;
}

function assertPositiveInteger(value, contextLabel) {
  assertInvariant(Number.isSafeInteger(value) && value > 0, `Invalid ${contextLabel}: expected positive integer.`, {
    value,
  });

  return value;
}

function readJsonFile(filePath, contextLabel) {
  assertInvariant(typeof filePath === "string" && filePath.length > 0, `Missing ${contextLabel} path.`);
  assertInvariant(fs.existsSync(filePath), `Missing ${contextLabel}: ${filePath}`);

  const rawText = fs.readFileSync(filePath, "utf8");

  try {
    return JSON.parse(rawText);
  } catch (error) {
    failClosed(`Malformed JSON in ${contextLabel}.`, {
      path: filePath,
      reason: error.message,
    });
  }
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function withOptionalPathPrefix(prefix, relativePath) {
  if (typeof prefix !== "string" || prefix.length === 0) {
    return relativePath;
  }

  const normalizedPrefix = prefix.replace(/\\/g, "/").replace(/\/+$/, "");
  return `${normalizedPrefix}/${relativePath}`;
}

function buildRelativeShardPath(familyId, shardIndex) {
  return path.posix.join(familyId, FAMILY_SHARDS_DIRNAME, getShardFileName(shardIndex));
}

function normalizeMappingEntryInscriptionId(inscriptionId, contextLabel, requireAssignedIds) {
  if (requireAssignedIds) {
    return assertCanonicalInscriptionId(inscriptionId, contextLabel);
  }

  if (inscriptionId === null || inscriptionId === "") {
    return null;
  }

  return assertCanonicalInscriptionId(inscriptionId, contextLabel);
}

function assertUniqueInscriptionId(inscriptionId, seenInscriptionIds, contextLabel) {
  assertInvariant(!seenInscriptionIds.has(inscriptionId), `Duplicate inscription id in ${contextLabel}.`, {
    inscription_id: inscriptionId,
  });
  seenInscriptionIds.add(inscriptionId);
}

function assertExpectedShardCount(familyId, entries, expectedShardCounts) {
  if (!expectedShardCounts) {
    return;
  }

  const expectedCount = expectedShardCounts[familyId];

  if (typeof expectedCount !== "number") {
    return;
  }

  assertInvariant(entries.length === expectedCount, "Shard inscription mapping count mismatch.", {
    family_id: familyId,
    expected_shard_count: expectedCount,
    mapped_shard_count: entries.length,
  });
}

function assertExpectedShardFilePath(familyId, index, shardFilePath, expectedShardFilesByFamily) {
  if (expectedShardFilesByFamily && Array.isArray(expectedShardFilesByFamily[familyId])) {
    const expectedPath = expectedShardFilesByFamily[familyId][index];

    assertInvariant(typeof expectedPath === "string" && expectedPath.length > 0, "Missing expected shard file path for mapping validation.", {
      family_id: familyId,
      shard_index: index,
    });
    assertInvariant(shardFilePath === expectedPath, "Shard mapping file path does not match expected shard location.", {
      family_id: familyId,
      shard_index: index,
      expected_shard_file: expectedPath,
      actual_shard_file: shardFilePath,
    });
    return;
  }

  const expectedSuffix = buildRelativeShardPath(familyId, index);
  const normalizedShardFilePath = shardFilePath.replace(/\\/g, "/");

  assertInvariant(
    normalizedShardFilePath === expectedSuffix || normalizedShardFilePath.endsWith(`/${expectedSuffix}`),
    "Shard mapping file path is not canonical for shard index.",
    {
      family_id: familyId,
      shard_index: index,
      expected_suffix: expectedSuffix,
      actual_shard_file: shardFilePath,
    }
  );
}

function normalizeLegacyShardMap(parsed, options) {
  assertExactKeys(parsed, SUPPORTED_FAMILIES, [], "shard map");

  const normalized = {};
  const seenInscriptionIds = new Set();

  for (const familyId of SUPPORTED_FAMILIES) {
    const entries = parsed[familyId];
    assertInvariant(Array.isArray(entries), `Invalid shard map ${familyId}: expected array of inscription ids.`);

    normalized[familyId] = entries.map((inscriptionId, index) => {
      const normalizedInscriptionId = normalizeMappingEntryInscriptionId(
        inscriptionId,
        `shard map ${familyId}[${index}]`,
        options.requireAssignedIds
      );

      if (normalizedInscriptionId !== null) {
        assertUniqueInscriptionId(normalizedInscriptionId, seenInscriptionIds, "shard map");
      }

      return normalizedInscriptionId;
    });

    assertExpectedShardCount(familyId, normalized[familyId], options.expectedShardCounts);
  }

  return normalized;
}

function normalizeTemplateShardMap(parsed, options) {
  assertExactKeys(parsed, SHARD_MAPPING_REQUIRED_KEYS, [], "shard inscription mapping");
  assertInvariant(
    parsed.mapping_version === SHARD_INSCRIPTION_MAPPING_VERSION,
    "Unsupported shard inscription mapping version.",
    {
      expected_mapping_version: SHARD_INSCRIPTION_MAPPING_VERSION,
      actual_mapping_version: parsed.mapping_version,
    }
  );

  assertExactKeys(parsed.families, SUPPORTED_FAMILIES, [], "shard inscription mapping families");

  const normalized = {};
  const seenInscriptionIds = new Set();

  for (const familyId of SUPPORTED_FAMILIES) {
    const entries = parsed.families[familyId];

    assertInvariant(Array.isArray(entries), `Invalid shard inscription mapping ${familyId}: expected array.`);
    assertExpectedShardCount(familyId, entries, options.expectedShardCounts);

    normalized[familyId] = entries.map((entry, index) => {
      assertExactKeys(entry, SHARD_MAPPING_ENTRY_REQUIRED_KEYS, [], `${familyId} shard mapping entry`);
      assertInvariant(Number.isSafeInteger(entry.index) && entry.index >= 0, `Invalid ${familyId} mapping index.`, {
        family_id: familyId,
        shard_index: entry.index,
      });
      assertInvariant(entry.index === index, "Shard mapping indexes must be contiguous and 0-based.", {
        family_id: familyId,
        expected_index: index,
        actual_index: entry.index,
      });

      assertInvariant(
        typeof entry.shard_file === "string" && entry.shard_file.length > 0,
        `Invalid ${familyId} shard mapping file path.`,
        {
          family_id: familyId,
          shard_index: index,
          shard_file: entry.shard_file,
        }
      );
      assertExpectedShardFilePath(familyId, index, entry.shard_file, options.expectedShardFilesByFamily);

      const normalizedInscriptionId = normalizeMappingEntryInscriptionId(
        entry.inscription_id,
        `${familyId} shard mapping inscription_id`,
        options.requireAssignedIds
      );

      if (normalizedInscriptionId !== null) {
        assertUniqueInscriptionId(normalizedInscriptionId, seenInscriptionIds, "shard inscription mapping");
      }

      return normalizedInscriptionId;
    });
  }

  return normalized;
}

function readShardInscriptionMap(filePath, options = {}) {
  const resolvedOptions = {
    requireAssignedIds: options.requireAssignedIds !== false,
    expectedShardCounts: options.expectedShardCounts || null,
    expectedShardFilesByFamily: options.expectedShardFilesByFamily || null,
  };

  const parsed = readJsonFile(filePath, "shard map");
  if (
    parsed !== null
    && typeof parsed === "object"
    && !Array.isArray(parsed)
    && Object.prototype.hasOwnProperty.call(parsed, "mapping_version")
    && Object.prototype.hasOwnProperty.call(parsed, "families")
  ) {
    return normalizeTemplateShardMap(parsed, resolvedOptions);
  }

  return normalizeLegacyShardMap(parsed, resolvedOptions);
}

function readFamilyShardFiles(outputDir, familyId, options = {}) {
  assertFamilyId(familyId);

  const allowMissingShardsDir = Boolean(options.allowMissingShardsDir);
  const shardsDir = getFamilyShardsDir(outputDir, familyId);

  if (!fs.existsSync(shardsDir)) {
    if (allowMissingShardsDir) {
      return [];
    }

    assertInvariant(false, `Missing ${familyId} shards directory: ${shardsDir}`);
  }

  const shardFiles = [];

  for (const childName of fs.readdirSync(shardsDir)) {
    const match = SHARD_FILENAME_PATTERN.exec(childName);

    if (!match) {
      continue;
    }

    const index = Number(match[1]);
    const filePath = path.join(shardsDir, childName);
    const bytes = fs.readFileSync(filePath);

    shardFiles.push({
      index,
      byteLength: bytes.length,
      sha256: sha256Hex(bytes),
      bytes,
      filePath,
      fileName: childName,
      relativePath: toPosixPath(path.join(familyId, FAMILY_SHARDS_DIRNAME, childName)),
    });
  }

  shardFiles.sort((left, right) => left.index - right.index);
  assertContiguousShardIndexes(shardFiles, familyId);

  return shardFiles;
}

function collectShardInventoryFromOutput(outputDir, options = {}) {
  assertInvariant(typeof outputDir === "string" && outputDir.length > 0, "Missing V2 output directory.");
  assertInvariant(fs.existsSync(outputDir), `Missing V2 output directory: ${outputDir}`);

  const inventory = {};

  for (const familyId of SUPPORTED_FAMILIES) {
    inventory[familyId] = readFamilyShardFiles(outputDir, familyId, options).map((shard) => ({
      index: shard.index,
      fileName: shard.fileName,
      relativePath: shard.relativePath,
      filePath: shard.filePath,
      byteLength: shard.byteLength,
      sha256: shard.sha256,
    }));
  }

  return inventory;
}

function buildShardInscriptionTemplateFromOutput(outputDir, options = {}) {
  const pathPrefix = typeof options.pathPrefix === "string" ? options.pathPrefix : "";
  const inventory = collectShardInventoryFromOutput(outputDir, {
    allowMissingShardsDir: options.allowMissingShardsDir === true,
  });

  const families = {};

  for (const familyId of SUPPORTED_FAMILIES) {
    families[familyId] = inventory[familyId].map((shard) => ({
      index: shard.index,
      shard_file: withOptionalPathPrefix(pathPrefix, shard.relativePath),
      inscription_id: null,
    }));
  }

  return {
    mapping_version: SHARD_INSCRIPTION_MAPPING_VERSION,
    families,
  };
}

function buildFamilyDescriptor(outputDir, familyId, shardInscriptionIds, options = {}) {
  assertFamilyId(familyId);

  const allowMissingStream = Boolean(options.allowMissingStream);
  const allowMissingShardsDir = Boolean(options.allowMissingShardsDir);

  const shards = readFamilyShardFiles(outputDir, familyId, { allowMissingShardsDir });

  const streamPath = getFamilyStreamPath(outputDir, familyId);
  const streamExists = fs.existsSync(streamPath);

  assertInvariant(streamExists || allowMissingStream, `Missing ${familyId} stream file: ${streamPath}`);

  const concatenatedShardBytes = shards.length === 0
    ? Buffer.alloc(0)
    : Buffer.concat(shards.map((shard) => shard.bytes), shards.reduce((sum, shard) => sum + shard.byteLength, 0));

  const streamBytes = streamExists ? fs.readFileSync(streamPath) : concatenatedShardBytes;

  if (streamExists) {
    assertInvariant(
      Buffer.compare(concatenatedShardBytes, streamBytes) === 0,
      "Shard bytes do not reconstruct the family stream exactly.",
      {
        family_id: familyId,
        shard_bytes_length: concatenatedShardBytes.length,
        stream_length: streamBytes.length,
      }
    );
  }


  if (streamBytes.length % RECORD_SIZE_BYTES !== 0) {
    failClosed("Invalid family stream length: not divisible by record size.", {
      family_id: familyId,
      stream_length: streamBytes.length,
      record_size_bytes: RECORD_SIZE_BYTES,
    });
  }

  assertInvariant(
    Array.isArray(shardInscriptionIds) && shardInscriptionIds.length === shards.length,
    `Shard inscription id count mismatch for ${familyId}.`,
    {
      family_id: familyId,
      shard_count: shards.length,
      inscription_id_count: Array.isArray(shardInscriptionIds) ? shardInscriptionIds.length : null,
    }
  );

  const reconstructedJsonl = reconstructJsonlBufferFromStream(streamBytes, familyId);

  return {
    family_id: familyId,
    stream_hash_sha256: sha256Hex(streamBytes),
    reconstructed_jsonl_hash_sha256: sha256Hex(reconstructedJsonl),
    jsonl_schema: JSONL_SCHEMA_ID,
    shards: shards.map((shard, index) => ({
      index: shard.index,
      inscription_id: assertCanonicalInscriptionId(shardInscriptionIds[index], `${familyId} shard inscription id`),
      byte_length: shard.byteLength,
      sha256: shard.sha256,
    })),
  };
}

function buildManifestV2FromOutput(outputDir, shardInscriptionMap, options = {}) {
  assertInvariant(typeof outputDir === "string" && outputDir.length > 0, "Missing V2 output directory.");
  assertInvariant(fs.existsSync(outputDir), `Missing V2 output directory: ${outputDir}`);
  assertExactKeys(shardInscriptionMap, SUPPORTED_FAMILIES, [], "shard inscription map");

  const buildOptions = {
    allowMissingStream: options.allowMissingStream === true,
    allowMissingShardsDir: options.allowMissingShardsDir === true,
  };

  const manifest = {
    manifest_version: MANIFEST_VERSION_V2,
    format_id: FORMAT_ID_V2,
    record_size_bytes: RECORD_SIZE_BYTES,
    shard_target_bytes: SHARD_TARGET_BYTES,
    families: {
      base: buildFamilyDescriptor(outputDir, "base", shardInscriptionMap.base, buildOptions),
      prospect: buildFamilyDescriptor(outputDir, "prospect", shardInscriptionMap.prospect, buildOptions),
      forged: buildFamilyDescriptor(outputDir, "forged", shardInscriptionMap.forged, buildOptions),
    },
  };

  validateManifestV2(manifest);
  return manifest;
}

function validateShardDescriptor(shard, familyId, expectedIndex, seenInscriptionIds) {
  assertExactKeys(shard, SHARD_REQUIRED_KEYS, [], `${familyId} shard descriptor`);

  assertInvariant(Number.isSafeInteger(shard.index) && shard.index >= 0, `Invalid ${familyId} shard index: expected non-negative integer.`, {
    family_id: familyId,
    index: shard.index,
  });
  assertInvariant(shard.index === expectedIndex, "Shard indexes must be contiguous and 0-based.", {
    family_id: familyId,
    expected_index: expectedIndex,
    actual_index: shard.index,
  });

  const inscriptionId = assertCanonicalInscriptionId(shard.inscription_id, `${familyId} shard inscription_id`);

  assertInvariant(!seenInscriptionIds.has(inscriptionId), "Duplicate shard inscription id within family descriptor.", {
    family_id: familyId,
    inscription_id: inscriptionId,
  });
  seenInscriptionIds.add(inscriptionId);

  const byteLength = assertPositiveInteger(shard.byte_length, `${familyId} shard byte_length`);
  assertInvariant(
    byteLength % RECORD_SIZE_BYTES === 0,
    "Shard byte length must be divisible by the fixed record size.",
    {
      family_id: familyId,
      byte_length: byteLength,
      record_size_bytes: RECORD_SIZE_BYTES,
    }
  );

  assertLowercaseSha256(shard.sha256, `${familyId} shard sha256`);
}

function validateFamilyDescriptor(familyKey, descriptor) {
  assertFamilyId(familyKey);
  assertExactKeys(descriptor, FAMILY_REQUIRED_KEYS, [], `${familyKey} family descriptor`);

  assertInvariant(descriptor.family_id === familyKey, "Family descriptor family_id must match its manifest key.", {
    family_id: descriptor.family_id,
    expected_family_id: familyKey,
  });
  assertLowercaseSha256(descriptor.stream_hash_sha256, `${familyKey} stream_hash_sha256`);
  assertLowercaseSha256(
    descriptor.reconstructed_jsonl_hash_sha256,
    `${familyKey} reconstructed_jsonl_hash_sha256`
  );
  assertInvariant(descriptor.jsonl_schema === JSONL_SCHEMA_ID, `Invalid ${familyKey} jsonl_schema.`, {
    family_id: familyKey,
    jsonl_schema: descriptor.jsonl_schema,
  });
  assertInvariant(Array.isArray(descriptor.shards), `Invalid ${familyKey} shards: expected array.`);

  const seenInscriptionIds = new Set();
  let totalByteLength = 0;

  for (let index = 0; index < descriptor.shards.length; index++) {
    validateShardDescriptor(descriptor.shards[index], familyKey, index, seenInscriptionIds);
    totalByteLength += descriptor.shards[index].byte_length;
  }

  if (descriptor.shards.length === 0) {
    assertInvariant(
      descriptor.stream_hash_sha256 === EMPTY_SHA256,
      `Invalid ${familyKey} stream_hash_sha256 for empty family stream.`,
      {
        family_id: familyKey,
        expected_sha256: EMPTY_SHA256,
        actual_sha256: descriptor.stream_hash_sha256,
      }
    );
    assertInvariant(
      descriptor.reconstructed_jsonl_hash_sha256 === EMPTY_SHA256,
      `Invalid ${familyKey} reconstructed_jsonl_hash_sha256 for empty family stream.`,
      {
        family_id: familyKey,
        expected_sha256: EMPTY_SHA256,
        actual_sha256: descriptor.reconstructed_jsonl_hash_sha256,
      }
    );
  }

  assertInvariant(
    totalByteLength % RECORD_SIZE_BYTES === 0,
    "Family shard byte lengths do not align to full record boundaries.",
    {
      family_id: familyKey,
      byte_length_total: totalByteLength,
      record_size_bytes: RECORD_SIZE_BYTES,
    }
  );
}

function validateManifestV2(manifest) {
  assertExactKeys(manifest, TOP_LEVEL_REQUIRED_KEYS, TOP_LEVEL_OPTIONAL_KEYS, "Manifest V2");

  assertInvariant(manifest.manifest_version === MANIFEST_VERSION_V2, "Unsupported manifest version.", {
    expected_manifest_version: MANIFEST_VERSION_V2,
    actual_manifest_version: manifest.manifest_version,
  });
  assertInvariant(manifest.format_id === FORMAT_ID_V2, "Invalid format_id for Manifest V2.", {
    expected_format_id: FORMAT_ID_V2,
    actual_format_id: manifest.format_id,
  });
  assertInvariant(manifest.record_size_bytes === RECORD_SIZE_BYTES, "Invalid record_size_bytes for Manifest V2.", {
    expected_record_size_bytes: RECORD_SIZE_BYTES,
    actual_record_size_bytes: manifest.record_size_bytes,
  });
  assertInvariant(manifest.shard_target_bytes === SHARD_TARGET_BYTES, "Invalid shard_target_bytes for Manifest V2.", {
    expected_shard_target_bytes: SHARD_TARGET_BYTES,
    actual_shard_target_bytes: manifest.shard_target_bytes,
  });

  if (Object.prototype.hasOwnProperty.call(manifest, "compatibility")) {
    assertPlainObject(manifest.compatibility, "Manifest V2 compatibility");
  }

  assertPlainObject(manifest.families, "Manifest V2 families");
  assertExactKeys(manifest.families, SUPPORTED_FAMILIES, [], "Manifest V2 families");

  for (const familyId of SUPPORTED_FAMILIES) {
    validateFamilyDescriptor(familyId, manifest.families[familyId]);
  }

  return manifest;
}

function readManifestV2File(filePath) {
  const manifest = readJsonFile(filePath, "Manifest V2");
  return validateManifestV2(manifest);
}

function summarizeManifestV2(manifest) {
  validateManifestV2(manifest);

  return {
    manifest_version: manifest.manifest_version,
    format_id: manifest.format_id,
    record_size_bytes: manifest.record_size_bytes,
    shard_target_bytes: manifest.shard_target_bytes,
    families: {
      base: {
        shard_count: manifest.families.base.shards.length,
        stream_hash_sha256: manifest.families.base.stream_hash_sha256,
      },
      prospect: {
        shard_count: manifest.families.prospect.shards.length,
        stream_hash_sha256: manifest.families.prospect.stream_hash_sha256,
      },
      forged: {
        shard_count: manifest.families.forged.shards.length,
        stream_hash_sha256: manifest.families.forged.stream_hash_sha256,
      },
    },
  };
}

module.exports = {
  SHARD_INSCRIPTION_MAPPING_VERSION,
  buildShardInscriptionTemplateFromOutput,
  collectShardInventoryFromOutput,
  buildManifestV2FromOutput,
  readManifestV2File,
  readShardInscriptionMap,
  summarizeManifestV2,
  validateManifestV2,
};
