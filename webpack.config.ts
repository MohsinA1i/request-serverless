import { resolve } from 'path'
import { Configuration } from 'webpack'

interface Environment {
    development: boolean
}

export default (environment: Environment): Configuration => {
    const configuration: Configuration = {
        entry: {
            'authorizer': './src/functions/authorizer/app.ts',
            'on-connect': './src/functions/on-connect/app.ts',
            'on-disconnect': './src/functions/on-disconnect/app.ts',
            'add-resource': './src/functions/add-resource/app.ts',
            'scrape-site': './src/functions/scrape-site/app.ts',
            'scrape-amazon-products': './src/functions/scrape-amazon-products/app.ts'
        },
        output: {
            filename: '[name]/[name].js',
            libraryTarget: 'commonjs',
            path: resolve(__dirname, 'build'),
        },
        target: 'node',
        resolve: {
            extensions: ['.ts', '.js'],
        },
        module: {
            rules: [
                { 
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    loader: 'ts-loader'
                },
                {
                    test: /.js$/,
                    include: [resolve(__dirname, 'src/functions/scrape-amazon-products/paapi')],
                    type: 'javascript/auto',
                    parser: { amd: false }
                }
            ],
        }
    }
    if (environment) {
        if (environment.development) {
            configuration.mode = 'development'
            configuration.devtool = 'source-map'
        } else {
            configuration.mode = 'production'
            configuration.externals = [{ 'aws-sdk': 'commonjs aws-sdk' }]
        }
    }
    return configuration
}