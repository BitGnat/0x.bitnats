"use strict";

const { assertInvariant, failClosed } = require("./constants");

function compareLogicalRecordsCanonical(left, right) {
  assertInvariant(left && right, "Cannot compare undefined logical records.");
  assertInvariant(Buffer.isBuffer(left.txidBytes) && Buffer.isBuffer(right.txidBytes), "Logical records are missing txid bytes.");

  const txidCompare = Buffer.compare(left.txidBytes, right.txidBytes);
  if (txidCompare !== 0) {
    return txidCompare;
  }

  return left.inscriptionIndex - right.inscriptionIndex;
}

function sortFamilyRecordsCanonical(records, familyId = "unknown") {
  assertInvariant(Array.isArray(records), `Invalid ${familyId} records: expected array.`);

  const sorted = [...records].sort(compareLogicalRecordsCanonical);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (compareLogicalRecordsCanonical(prev, curr) === 0) {
      failClosed("Duplicate logical record detected in canonical sort.", {
        family_id: familyId,
        id: curr.id,
      });
    }
  }

  return sorted;
}

function sortClassifiedFamiliesCanonical(classifiedFamilies) {
  assertInvariant(
    classifiedFamilies && typeof classifiedFamilies === "object",
    "Invalid classified families: expected object."
  );

  return {
    base: sortFamilyRecordsCanonical(classifiedFamilies.base || [], "base"),
    prospect: sortFamilyRecordsCanonical(classifiedFamilies.prospect || [], "prospect"),
    forged: sortFamilyRecordsCanonical(classifiedFamilies.forged || [], "forged"),
  };
}

module.exports = {
  compareLogicalRecordsCanonical,
  sortClassifiedFamiliesCanonical,
  sortFamilyRecordsCanonical,
};