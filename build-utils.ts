import archiver from "archiver";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = "D:/Projects/!Roleplaying/!!!KULT/EUNOS-KULT-HACKS";
const ZIP_NAME = "eunos-kult-hacks.zip";

async function createZipArchive(): Promise<void> {
  // Skip zip creation if SKIP_ZIP environment variable is set to true
  if (process.env["SKIP_ZIP"] === "true") {
    console.log("\nSkipping zip creation as SKIP_ZIP is set to true");
    return;
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const zipPath = path.join(OUTPUT_DIR, ZIP_NAME);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver.create("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    console.log(`\nCreated ${zipPath} (${archive.pointer()} total bytes)`);
    console.log(`Upload your module at: https://forge-vtt.com/packages/upload`);
  });

  archive.on("warning", (err) => {
    if (err.code === "ENOENT") {
      console.warn("Warning:", err);
    } else {
      throw err;
    }
  });

  archive.on("error", (err) => {
    throw err;
  });

  archive.pipe(output);

  // Add all files from dist directory
  archive.directory("dist/", false);

  await archive.finalize();
}

// Run the script
createZipArchive().catch((error: unknown) => {
  console.error("Failed to create zip archive:", error);
  process.exit(1);
});
