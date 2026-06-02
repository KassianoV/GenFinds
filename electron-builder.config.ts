import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.genfinds.app',
  productName: 'GenFinds',
  copyright: `Copyright © ${new Date().getFullYear()} Kassiano Vieira`,

  directories: {
    output: 'release',
    buildResources: 'assets'
  },

  files: ['dist-electron/**/*', 'dist/**/*'],

  win: {
    icon: 'assets/icon.ico',
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] }
    ]
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'assets/icon.ico',
    uninstallerIcon: 'assets/icon.ico',
    installerHeaderIcon: 'assets/icon.ico',
    shortcutName: 'GenFinds',
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },

  portable: {
    artifactName: '${productName}-${version}-portable.exe'
  }
}

export default config
