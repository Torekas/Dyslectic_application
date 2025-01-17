const fs = require("fs");
const path = require("path");

// 1. Read all files in the current directory
const files = fs.readdirSync(__dirname);

// 2. Filter for only .ttf or .otf files
const fontFiles = files.filter((file) => {
  const ext = path.extname(file).toLowerCase();
  return ext === ".ttf" || ext === ".otf";
});

// 3. Loop through each font file and create a .js file
fontFiles.forEach((fontFile) => {
  const fontPath = path.join(__dirname, fontFile);
  const fontExt = path.extname(fontFile).toLowerCase();

  // Determine the correct format for the data URL
  // .ttf => font/truetype
  // .otf => font/opentype
  let fontFormat;
  if (fontExt === ".ttf") {
    fontFormat = "font/truetype";
  } else if (fontExt === ".otf") {
    fontFormat = "font/opentype";
  }

  // Read the font file into a Buffer
  const fontBuffer = fs.readFileSync(fontPath);

  // Convert Buffer to Base64
  const base64Font = fontBuffer.toString("base64");

  // Build the JS content (ES module export as an example)
  const outputJS = `
// Automatically generated for ${fontFile}
export default "data:${fontFormat};base64,${base64Font}";
`;

  // Create a new filename: e.g., "arial.js" if the font is "arial.ttf"
  const baseName = path.basename(fontFile, fontExt); // e.g. "arial"
  const jsFileName = `${baseName}.js`; // => "arial.js"

  // Write the .js file
  fs.writeFileSync(path.join(__dirname, jsFileName), outputJS, "utf8");
  console.log(`Converted: ${fontFile} => ${jsFileName}`);
});

console.log("All fonts converted!");
