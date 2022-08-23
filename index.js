#!/usr/bin/env node

import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';

/**
 * @typedef {Object} Argv
 *
 * @property {string} input
 * @property {string} output
 * @property {string} [cdn]
 * @property {boolean} [list]
 */

/**
 * @param {string[]} args
 * @returns {Argv}
 */
function parseArgs(args) {
  const options = {
    input: '.',
    output: '.',
    list: false,
  };

  const flagToOptionMap = {
    '--in': 'input',
    '--out': 'output',
    '--cdn': 'cdn',
    '--list': 'list',
  };

  args.forEach(arg => {
    const isValidFlag = Object.keys(flagToOptionMap).some(key => arg.startsWith(key));

    if (!isValidFlag) {
      return;
    }

    const [flag, value] = arg.split('=');

    const optionKey = flagToOptionMap[flag];

    if (!optionKey) {
      return;
    }

    options[optionKey] = value !== '' ? value : true;
  });

  return options;
}

/** @param {string} path */
function ensureDir(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
}

/** @param {string} path */
function isDirectory(path) {
  return fs.statSync(path).isDirectory();
}

/** @param {string} filepath */
function readFile(filepath) {
  return fs.promises.readFile(filepath, { encoding: 'utf-8' });
}

/** @param {string} string */
function trim(string) {
  return string.trim();
}

/** @param {string} string */
function splitByNewline(string) {
  return string.split('\n');
}

/**
 * @template T
 *
 * @param {T[]} list
 */
function deduplicate(list) {
  return Array.from(new Set(list));
}

/** @param {string} input */
function getUrlsFromFile(input) {
  return readFile(input).then(trim).then(splitByNewline);
}

/** @param {unknown} value */
function isString(value) {
  return typeof value === 'string';
}

/**
 * @param {string} directory
 * @returns {string[]}
 */
function readDirRecursively(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((filepath) => {
      const fullPath = path.join(directory, filepath.name);
      if (filepath.isDirectory()) {
        return readDirRecursively(fullPath);
      }

      return fullPath;
    });
}

/** @param {string} file */
function isJSONFile(file) {
  return path.extname(file) === '.json';
}

/** @param {string} directory */
function getJSONFilesFromDirectory(directory) {
  return readDirRecursively(directory).filter(isJSONFile);
}

/**
 * @param {string} root
 * @param {string} cdnPath
 */
function getUrlsFromProject(root, cdnPath) {
  const directories = ['config', 'templates'].map((directory) =>
    path.join(root, directory)
  );

  /** @type {string[]} */
  const images = [];
  const imagePrefix = 'shopify://shop_images/';
  const dataFiles = directories.flatMap(getJSONFilesFromDirectory);

  dataFiles.forEach((file) => {
    const data = fs.readFileSync(file, { encoding: 'utf-8' });

    try {
      JSON.parse(data, (_, value) => {
        if (!isString(value)) {
          return;
        }

        if (!value.startsWith(imagePrefix)) {
          return;
        }

        images.push(value);
      });
    } catch (error) {
      throw new Error(`Cannot parse file: ${file}. File must be valid JSON.`);
    }
  });

  return images.map((image) => {
    const url = new URL(cdnPath);
    url.pathname = path.join(url.pathname, image.replace(imagePrefix, ''));

    return url.href;
  });
}

(async () => {
  const { input, output, cdn, list } = parseArgs(process.argv.slice(2));

  const inputIsDirectory = isDirectory(input);
  const cdnIsRequired = inputIsDirectory;

  if (cdnIsRequired && !cdn) {
    throw new Error(`--cdn is required.`);
  }

  let urls = inputIsDirectory
    ? getUrlsFromProject(input, cdn)
    : await getUrlsFromFile(input);

  urls = deduplicate(urls);

  if (list) {

  }

  ensureDir(output);

  console.log(`Found ${urls.length} files. Downloading...`);

  urls.forEach((url) => {
    const filename = path.basename(url);
    const stream = fs.createWriteStream(path.join(output, filename));
    https.get(url, (response) => {
      response.pipe(stream);
    });
  });

  console.log(`Finished downloading ${urls.length} files.`);
})();
