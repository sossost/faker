/* eslint-disable no-restricted-globals */

import { constants } from 'node:fs';
import {
  access,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatTypescript } from './apidocs/utils/format';

// Constants
const pathRoot: string = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pathLocales: string = resolve(pathRoot, 'src', 'locales');

const scriptCommand = 'pnpm run generate:date';
const autoGeneratedCommentHeader = `/*
 * This file is automatically generated.
 * Run '${scriptCommand}' to update.
 */`;

// Function to check if a locale is valid
function isValidLocale(locale: string): boolean {
  try {
    new Intl.DateTimeFormat(locale);
    return true;
  } catch {
    return false;
  }
}

// Function to update weekday values for a given locale
async function updateWeekdaysForLocale(locale: string): Promise<void> {
  if (locale === 'dv') return;

  const dateFolderPath: string = resolve(pathLocales, locale, 'date');
  const weekdayPath: string = resolve(dateFolderPath, 'weekday.ts');

  // Check if the weekday.ts file exists, if not create it
  try {
    await access(weekdayPath, constants.R_OK);
  } catch {
    console.log(`Creating weekday.ts file for locale ${locale}.`);
    const defaultWeekdayContent = `export default { "wide": [], "abbr": [] };`;
    await writeFile(weekdayPath, await formatTypescript(defaultWeekdayContent));
  }

  // Read the current weekday values
  const fileContent: string = await readFile(weekdayPath, 'utf8');

  // Remove 'export default ' and convert to object
  const objectString: string = fileContent
    .replace(/export\s+default\s+/, '')
    .trim()
    .replace(/;$/, '');
  let storedWeekdays: { wide: string[]; abbr: string[] };
  try {
    storedWeekdays = eval(`(${objectString})`);
  } catch (error) {
    console.error(`Failed to parse JSON for locale ${locale}:`, error);
    return;
  }

  // Generate correct weekday values
  const validLocale: string = isValidLocale(locale) ? locale : 'en';
  const wide: string[] = [];
  const abbr: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date: Date = new Date(1970, 0, i + 4); // 1970-01-04 is a Sunday
    wide.push(
      new Intl.DateTimeFormat(validLocale, { weekday: 'long' }).format(date)
    );
    abbr.push(
      new Intl.DateTimeFormat(validLocale, { weekday: 'short' }).format(date)
    );
  }

  // Update stored weekdays
  storedWeekdays.wide = wide;
  storedWeekdays.abbr = abbr;

  // Write updated values back to the file
  const updatedContent = `${autoGeneratedCommentHeader}
export default ${JSON.stringify(storedWeekdays, null, 2)};`;
  await writeFile(weekdayPath, await formatTypescript(updatedContent));
}

// Function to update month values for a given locale
async function updateMonthForLocale(locale: string): Promise<void> {
  if (locale === 'dv') return;

  const dateFolderPath: string = resolve(pathLocales, locale, 'date');
  const monthPath: string = resolve(dateFolderPath, 'month.ts');

  // Check if the month.ts file exists, if not create it
  try {
    await access(monthPath, constants.R_OK);
  } catch {
    console.log(`Creating month.ts file for locale ${locale}.`);
    const defaultMonthContent = `export default { "wide": [], "abbr": [] };`;
    await writeFile(monthPath, await formatTypescript(defaultMonthContent));
  }

  // Read the current month values
  const fileContent: string = await readFile(monthPath, 'utf8');

  // Remove 'export default ' and convert to object
  const objectString: string = fileContent
    .replace(/export\s+default\s+/, '')
    .trim()
    .replace(/;$/, '');
  let storedMonths: { wide: string[]; abbr: string[] };
  try {
    storedMonths = eval(`(${objectString})`);
  } catch (error) {
    console.error(`Failed to parse JSON for locale ${locale}:`, error);
    return;
  }

  // Generate correct month values
  const validLocale: string = isValidLocale(locale) ? locale : 'en';
  const wide: string[] = [];
  const abbr: string[] = [];
  for (let i = 0; i < 12; i++) {
    const date: Date = new Date(1970, i, 1);
    wide.push(
      new Intl.DateTimeFormat(validLocale, { month: 'long' }).format(date)
    );
    abbr.push(
      new Intl.DateTimeFormat(validLocale, { month: 'short' }).format(date)
    );
  }

  // Update stored months
  storedMonths.wide = wide;
  storedMonths.abbr = abbr;

  // Write updated values back to the file
  const updatedContent = `${autoGeneratedCommentHeader}
   export default ${JSON.stringify(storedMonths, null, 2)};`;
  await writeFile(monthPath, await formatTypescript(updatedContent));
}

// Function to create date folder and index.ts file if not exists
async function createDateFolderAndIndex(locale: string): Promise<void> {
  const dateFolderPath: string = resolve(pathLocales, locale, 'date');
  const dateIndexPath: string = resolve(dateFolderPath, 'index.ts');
  const localeIndexPath: string = resolve(pathLocales, locale, 'index.ts');

  // Check if the date folder exists, if not create it
  try {
    await access(dateFolderPath, constants.R_OK);
  } catch {
    console.log(`Creating date folder for locale ${locale}.`);
  } finally {
    await mkdir(dateFolderPath, { recursive: true });

    // Create a new index.ts file for the date module
    const dateIndexContent = `
      ${autoGeneratedCommentHeader}
      import type { DateDefinition } from '../../..';
      import month from './month';
      import weekday from './weekday';

      const date: DateDefinition = {
        month,
        weekday,
      };

      export default date;
    `;
    await writeFile(dateIndexPath, await formatTypescript(dateIndexContent));
  }

  // Update the locale index file to include date
  let localeIndexContent: string = await readFile(localeIndexPath, 'utf8');
  if (!localeIndexContent.includes("import date from './date';")) {
    localeIndexContent = localeIndexContent.replace(
      "import type { LocaleDefinition } from '../..';",
      "import type { LocaleDefinition } from '../..';\nimport date from './date';"
    );
    localeIndexContent = localeIndexContent.replace(
      /(const \w+: LocaleDefinition = {)/,
      `$1\n  date,`
    );
    await writeFile(
      localeIndexPath,
      await formatTypescript(localeIndexContent)
    );
  }
}

// Main function to update all locales
async function updateAllLocales(): Promise<void> {
  const locales: string[] = await readdir(pathLocales);

  for (const locale of locales) {
    const localePath: string = resolve(pathLocales, locale);
    const localeStat = await stat(localePath);

    if (localeStat.isDirectory()) {
      await createDateFolderAndIndex(locale);
      await updateMonthForLocale(locale);
      await updateWeekdaysForLocale(locale);
    } else {
      console.log(`Skipping ${locale} as it is not a directory.`);
    }
  }
}

// Run the script to update weekdays for all locales
await updateAllLocales();
