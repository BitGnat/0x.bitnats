"use strict";

const {
  BASE_REQUIRED_INDEX,
  FORGED_REQUIRED_INDEX,
  PROSPECT_MIN_INDEX,
  U8_MAX,
  assertFamilyId,
  assertInvariant,
  failClosed,
} = require("./constants");

function createEmptyFamilyBuckets() {
  return {
    base: [],
    prospect: [],
    forged: [],
  };
}

function isSupportedProspectIndex(index) {
  return Number.isInteger(index) && index >= PROSPECT_MIN_INDEX && index <= U8_MAX;
}

function inferFamilyFromIndex(inscriptionIndex) {
  if (inscriptionIndex === BASE_REQUIRED_INDEX) {
    return "base";
  }

  if (inscriptionIndex === FORGED_REQUIRED_INDEX) {
    return "forged";
  }

  if (isSupportedProspectIndex(inscriptionIndex)) {
    return "prospect";
  }

  failClosed("Unsupported inscription index: cannot infer family.", {
    inscription_index: inscriptionIndex,
  });
}

function validateRecordFamilyPair(record, family) {
  const index = record.inscriptionIndex;

  if (family === "base") {
    assertInvariant(
      index === BASE_REQUIRED_INDEX,
      "Invalid base record: base requires inscription index 0.",
      {
        id: record.id,
        inscription_index: index,
      }
    );
    return;
  }

  if (family === "forged") {
    assertInvariant(
      index === FORGED_REQUIRED_INDEX,
      "Invalid forged record: forged requires inscription index 1.",
      {
        id: record.id,
        inscription_index: index,
      }
    );
    return;
  }

  if (family === "prospect") {
    assertInvariant(
      isSupportedProspectIndex(index),
      "Invalid prospect record: prospect requires a protocol-supported non-base/non-forged index.",
      {
        id: record.id,
        inscription_index: index,
        supported_range: `${PROSPECT_MIN_INDEX}-${U8_MAX}`,
      }
    );
    return;
  }

  failClosed("Unsupported family id during record classification.", {
    family_id: family,
    id: record.id,
  });
}

function resolveRecordFamily(record, options = {}) {
  const explicitFamily = typeof record.family === "string" ? record.family : null;
  const defaultFamily = typeof options.defaultFamily === "string" ? options.defaultFamily : null;
  const allowIndexInference = options.allowIndexInference === true;

  if (explicitFamily !== null) {
    assertFamilyId(explicitFamily);
    return explicitFamily;
  }

  if (defaultFamily !== null) {
    assertFamilyId(defaultFamily);
    return defaultFamily;
  }

  if (allowIndexInference) {
    return inferFamilyFromIndex(record.inscriptionIndex);
  }

  failClosed("Missing semantic family assignment for record.", {
    id: record.id,
    inscription_index: record.inscriptionIndex,
  });
}

function classifyRecord(record, options = {}) {
  assertInvariant(record && typeof record === "object", "Invalid logical record for classification.");
  assertInvariant(typeof record.id === "string" && record.id.length > 0, "Invalid logical record: missing id.");

  const family = resolveRecordFamily(record, options);
  validateRecordFamilyPair(record, family);

  return family;
}

function classifyRecords(records, options = {}) {
  assertInvariant(Array.isArray(records), "Invalid logical records: expected array.");

  const buckets = createEmptyFamilyBuckets();
  const seenIds = new Set();

  for (const record of records) {
    assertInvariant(record && typeof record.id === "string", "Invalid logical record: missing id.");

    if (seenIds.has(record.id)) {
      failClosed("Duplicate logical record encountered during classification.", {
        id: record.id,
      });
    }

    seenIds.add(record.id);

    const family = classifyRecord(record, options);
    buckets[family].push(record);
  }

  return buckets;
}

module.exports = {
  classifyRecord,
  classifyRecords,
  createEmptyFamilyBuckets,
  inferFamilyFromIndex,
  isSupportedProspectIndex,
  validateRecordFamilyPair,
};