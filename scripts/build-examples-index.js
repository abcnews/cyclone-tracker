/** @file
 * Build an examples-index.json file from a directory of files.
 *
 * 1. get these files from the production tcdata dir, or the more verbose archive dir of the cyclone tracker service.
 * 2. chuck them in a dir called `examples`
 * 3. run the script.
 * 4. Upload your dir and index to the s3 bucket.
 */
import { readdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const EXAMPLES_DIR = resolve(__dirname, 'examples');
const OUTPUT_FILE = resolve(__dirname, 'examples-index.json');

const files = await readdir(EXAMPLES_DIR);

// 1. Map files to cyclone objects (using Promise.all for async file reading)
const cyclonePromises = files
  .filter(file => file.endsWith('.gml'))
  .map(async file => {
    const match = file.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
    if (!match) return null;

    const [_, year, month, day, hour, minute] = match;
    const isoString = `${year}-${month}-${day}T${hour}:${minute}:00`;

    // Read file content to find <distName>
    const filePath = join(EXAMPLES_DIR, file);
    const content = await readFile(filePath, 'utf-8');

    // Extract distName using Regex
    const distMatch = content.match(/<distName>(.*?)<\/distName>/);
    const distName = distMatch ? distMatch[1] : 'Unknown';

    // Create human-readable name (Local Time)
    const timeStr = new Date(isoString).toLocaleString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return {
      path: file,
      name: `${distName} (${timeStr})`, // Prepend distName to the name field
      date: isoString,
      expiryHrs: '8'
    };
  });

// Resolve all promises and filter out nulls
const cyclones = (await Promise.all(cyclonePromises)).filter(Boolean);

// 2. Assemble and write
const finalData = {
  updated: new Date().toLocaleString('en-AU', { timeZoneName: 'short' }),
  cyclones
};

await writeFile(OUTPUT_FILE, JSON.stringify(finalData, null, 2));

console.log(`Updated ${OUTPUT_FILE}`);
