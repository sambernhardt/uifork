function toPascalCaseIdentifier(name) {
  const chunks = String(name || "").match(/[a-zA-Z0-9]+/g) || [];
  const identifier = chunks
    .map((chunk) => `${chunk.charAt(0).toUpperCase()}${chunk.slice(1)}`)
    .join("");

  if (!identifier) {
    return "Component";
  }

  if (!/^[A-Za-z_$]/.test(identifier)) {
    return `Component${identifier}`;
  }

  return identifier;
}

function versionToImportSuffix(versionStr) {
  return `V${versionStr.charAt(0).toUpperCase()}${versionStr.slice(1)}`;
}

function getVersionComponentIdentifier(componentName, versionStr) {
  return `${toPascalCaseIdentifier(componentName)}${versionToImportSuffix(versionStr)}`;
}

module.exports = {
  getVersionComponentIdentifier,
  toPascalCaseIdentifier,
  versionToImportSuffix,
};
