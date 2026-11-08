import path from 'node:path'
import { Config } from '@remotion/cli/config'

// The reel imports the site's shared art from ../src; make those files use this folder's React.
Config.overrideWebpackConfig((c) => ({
  ...c,
  resolve: {
    ...c.resolve,
    alias: {
      ...(c.resolve?.alias as object),
      react: path.resolve(process.cwd(), 'node_modules/react'),
      'react-dom': path.resolve(process.cwd(), 'node_modules/react-dom'),
    },
  },
}))
