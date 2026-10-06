const { withAppBuildGradle } = require("expo/config-plugins");
module.exports = (config) =>
  withAppBuildGradle(config, (mod) => {
    const marker = "// Harmonia production signing";
    if (!mod.modResults.contents.includes(marker))
      mod.modResults.contents += `
${marker}
if (System.getenv('HARMONIA_PRODUCTION') == '1') {
  ['HARMONIA_STORE_FILE','HARMONIA_STORE_PASSWORD','HARMONIA_KEY_ALIAS','HARMONIA_KEY_PASSWORD'].each { key ->
    if (!System.getenv(key)) throw new GradleException('Missing required production signing configuration: ' + key)
  }
  android {
    signingConfigs {
      production {
        storeFile file(System.getenv('HARMONIA_STORE_FILE'))
        storePassword System.getenv('HARMONIA_STORE_PASSWORD')
        keyAlias System.getenv('HARMONIA_KEY_ALIAS')
        keyPassword System.getenv('HARMONIA_KEY_PASSWORD')
      }
    }
    buildTypes { release { signingConfig signingConfigs.production } }
  }
}
`;
    return mod;
  });
