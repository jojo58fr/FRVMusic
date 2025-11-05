import fs from "fs";

fs.readFile("./package.json", function (err, rawPackageJson) {
  if (err) throw err;

  const packageJson = JSON.parse(rawPackageJson);
  const currentVersion = packageJson.version;

  let [major, minor, patch] = currentVersion.split(".");
  major = parseInt(major, 10);
  minor = parseInt(minor, 10);
  patch = parseInt(patch, 10);

  let newVersion = "";
  let newPatch = 0;
  let newMinor = 0;
  let newMajor = 0;

  if (patch > 99) {
    newPatch = 0;
    newMinor = minor + 1;
    newMajor = major;

    if (newMinor > 9) {
      newMinor = 0;
      newMajor = major + 1;
    }

    newVersion = `${newMajor}.${newMinor}.${newPatch}`;
  } else {
    newPatch = patch + 1;
    newMinor = minor;
    newMajor = major;
    newVersion = `${newMajor}.${newMinor}.${newPatch}`;
  }

  if (newVersion !== currentVersion) {
    packageJson.version = newVersion;
    fs.writeFileSync("./package.json", JSON.stringify(packageJson, null, 2));
    console.log(`Version updated to ${newVersion} to package.json`);

    console.log("Incrementing build number in the metadata files...");
    fs.readFile("./metadata-version.json", function (metadataErr, content) {
      if (metadataErr) throw metadataErr;

      const metadata = JSON.parse(content);

      metadata.buildMajor = newMajor;
      metadata.buildMinor = newMinor;
      metadata.buildRevision = newPatch;

      console.log("buildRevision", metadata.buildRevision);

      fs.writeFile("./metadata-version.json", JSON.stringify(metadata, null, 2), function (writeErr) {
        if (writeErr) throw writeErr;
        console.log(
          `Current build number: ${metadata.buildMajor}.${metadata.buildMinor}.${metadata.buildRevision} ${metadata.buildTag}`,
        );
      });
    });
  } else {
    console.log("No version update required");
  }
});
