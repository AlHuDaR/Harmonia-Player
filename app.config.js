export default {
  expo: {
    name: "Harmonia Player",
    slug: "harmonia-player",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: ["expo-router"],
    experiments: {
      typedRoutes: true
    },
    extra: {
      youtubeApiKey: "AIzaSyCOyHZDLTgo6eod53lSS4egQNhix4SZIXI"
    }
  }
};