import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { LINES } from '../src/roster.ts';

const STAGE_FOLDERS = [
  '1i7_A82jBpJmkowYykChbiR5Qrhj7xDOk',
  '1fIkCd1O51DAIFiptGOvq7FUrVdsLiRAD',
  '1oG_33fKaEVEywaNORokkcMMrxOu_GYTm',
  '1vEM7Mx7s3-gJdkaH0G6DNHHcsz2llPAw',
  '1YMqbJpIob0fVKXbCrVuVD1q471mU7VTp',
  '1rR1XNwE9-xg_zITn7xo2yN9527kF1_z8',
  '1faVdHU3yKRuHOA_MFX41RaRNqwhkQsQt'
];

const ENTRY = /id="entry-(?<id>[\w-]+)"[\s\S]*?flip-entry-title">(?<title>[^<]+)</gu;

async function listFolder(folderId: string): Promise<[string, string][]> {
  const response = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}`);
  if (!response.ok) throw new Error(`Folder ${folderId}: HTTP ${response.status}`);
  const html = await response.text();
  return [...html.matchAll(ENTRY)].map((match) => [
    match.groups?.title ?? '',
    match.groups?.id ?? ''
  ]);
}

async function downloadFile(fileId: string, path: string): Promise<void> {
  const response = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  await writeFile(path, new Uint8Array(await response.arrayBuffer()));
}

const outputDirectory = process.argv[2] ?? 'sprites';
await mkdir(outputDirectory, { recursive: true });

const listings = await Promise.all(STAGE_FOLDERS.map((folderId) => listFolder(folderId)));
const files = new Map(listings.flat());

const wanted = LINES.flatMap((line) => Object.values(line.forms));
const missing = wanted.filter((name) => !files.has(`${name}.png`));
if (missing.length > 0) throw new Error(`Not in the set: ${missing.join(', ')}`);

await Promise.all(
  wanted.map((name) =>
    downloadFile(files.get(`${name}.png`) ?? '', join(outputDirectory, `${name}.png`))
  )
);
console.log(`Downloaded ${wanted.length} sheets to ${outputDirectory}`);
