const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const ideConfig = {
    mode: 'production', // development
    context: path.resolve(__dirname, 'htdocs'),
    entry: {
        home: [
            "regenerator-runtime/runtime.js", // to get async...await working
            './js/main/IDEStarter.js',
            './css/editor.css',
            './css/editorStatic.css',
            './css/bottomdiv.css',
            './css/helper.css',
            './css/icons.css',
            './css/databaseExplorer.css',
            './css/run.css',
            './css/dialog.css',
            './css/databasedialogs.css',
            './assets/fonts/fonts.css',
        ],
        // style: [
        //     './htdocs/css/embedded.css'
        // ]
    },
    devtool: 'source-map',
    performance: {
        hints: false
    },
    output: {
        path: path.resolve(__dirname, 'htdocs/js.webpack'),
        filename: 'sql-ide.js',
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: ["babel-loader", "source-map-loader"],
                enforce: "pre"
            }, {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },{
                test: /\.(png|jpe?g|gif|woff|woff2|svg|ttf|eot)$/i,
                use: [
                  {
                    loader: 'file-loader',
                    options: {
                        emitFile: false,
                        name: '../[path][name].[ext]'
                      },
                  },
                ],
              },
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
          // Options similar to the same options in webpackOptions.output
          // all options are optional
          filename: 'sql-ide.css',
          chunkFilename: 'Chunkfile.css',
          ignoreOrder: false, // Enable to remove warnings about conflicting order
        }),
      ]
}

const embeddedConfig = {
    mode: 'production', // development
    context: path.resolve(__dirname, 'htdocs'),
    entry: {
        home: [
            "regenerator-runtime/runtime.js", // to get async...await working
            './js/embedded/EmbeddedStarter.js',
            './css/editor.css',
            './css/bottomdiv.css',
            './css/icons.css',
            './css/databaseExplorer.css',
            './css/run.css',
            './assets/fonts/fonts.css',
            './css/embedded.css',
        ],
        // style: [
        //     './htdocs/css/embedded.css'
        // ]
    },
    devtool: 'source-map',
    performance: {
        hints: false
    },
    output: {
        path: path.resolve(__dirname, 'htdocs/js.webpack'),
        filename: 'sql-ide-embedded.js',
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: ["babel-loader", "source-map-loader"],
                enforce: "pre"
            }, {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },{
                test: /\.(png|jpe?g|gif|woff|woff2|svg|ttf|eot)$/i,
                use: [
                  {
                    loader: 'file-loader',
                    options: {
                        emitFile: false,
                        name: '../[path][name].[ext]'
                      },
                  },
                ],
              },
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
          // Options similar to the same options in webpackOptions.output
          // all options are optional
          filename: 'sql-ide-embedded.css',
          chunkFilename: 'Chunkfile.css',
          ignoreOrder: false, // Enable to remove warnings about conflicting order
        }),
      ]
}



module.exports = [ideConfig, embeddedConfig];