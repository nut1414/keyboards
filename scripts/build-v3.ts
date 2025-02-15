import fs from 'fs';
import glob from 'glob';
import path from 'path';
import {
  keyboardDefinitionV2ToVIADefinitionV2,
  getTheme,
  KeyboardDefinitionIndex,
  keyboardDefinitionV3ToVIADefinitionV3,
  isVIADefinitionV2,
  isVIADefinitionV3,
} from 'via-reader';
import stringify from 'json-stringify-pretty-compact';
import {buildIsolatedDefinitions} from './build-isolated-definitions';
var packageJson = require('../package.json');

export async function buildV3() {
  try {
    const v2DefinitionIds = await buildIsolatedDefinitions(
      'v2',
      keyboardDefinitionV2ToVIADefinitionV2,
      isVIADefinitionV2
    );
    const v3DefinitionIds = await buildIsolatedDefinitions(
      'v3',
      keyboardDefinitionV3ToVIADefinitionV3,
      isVIADefinitionV3
    );

    const definitionIndex: KeyboardDefinitionIndex = {
      generatedAt: Date.now(),
      version: packageJson.version,
      theme: getTheme(),
      vendorProductIds: {
        v2: v2DefinitionIds,
        v3: v3DefinitionIds.filter((vpid) => !v2DefinitionIds.includes(vpid)),
      },
    };

    fs.writeFileSync('dist/supported_kbs.json', stringify(definitionIndex));

    // Read all common-menus configurations asynchronously.
    const commonMenusFiles = glob.sync('common-menus/**.json');
    const commonMenusJson = {} as Record<string, string>;
    const commonMenusReaders = commonMenusFiles.map((commonMenuFile) => {
      return fs.promises.readFile(commonMenuFile, 'utf8');
    });

    // Combine all common-menus configurations into a single core.json file
    Promise.all(commonMenusReaders).then((commonMenus) => {
      commonMenus.forEach((menu, i) => {
        // Parse out just the filename for the key:
        // common-menus/qmk_audio.json -> qmk_audio
        const fileName = path.parse(commonMenusFiles[i]).name;

        commonMenusJson[fileName] = JSON.parse(menu);
      });
      fs.writeFileSync('dist/common-menus.json', stringify(commonMenusJson));
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
