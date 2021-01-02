import { APIGatewayProxyEvent, APIGatewayTokenAuthorizerEvent } from 'aws-lambda'
import https from 'https'
import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem'

type Event = APIGatewayProxyEvent & APIGatewayTokenAuthorizerEvent

interface PublicKey {
    alg: string
    e: string
    kid: string
    kty: 'RSA'
    n: string
    use: string
}

interface Claim {
    sub: string,
    event_id: string,
    token_use: string,
    scope: string,
    auth_time: number,
    iss: string,
    exp: number,
    iat: number,
    jti: string,
    client_id: string,
    username: string
}

interface Context {
    userID?: string
}

export const lambdaHandler = async (event: Event) => {
    const token = event.queryStringParameters!.token
    if (!token) throw new Error('Unauthorized')
    
    const kid = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString()).kid

    const serviceURL = `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_47AghMuTk`

    const keysURL = `${serviceURL}/.well-known/jwks.json`
    const publicKeys: PublicKey[] = JSON.parse(await getRequest(keysURL)).keys
    const publicKey = publicKeys.find((key) => key.kid === kid)
    if (!publicKey) throw Error(`Public key not found at ${keysURL}`)

    const pem = jwkToPem(publicKey)
    const claim = jwt.verify(token, pem) as Claim

    if (claim.iss !== serviceURL) throw Error('Invalid iss')
    if (claim.client_id !== '3q2cp7nqbkmr0krgr6ncf8l9q') throw Error('Invalid client id')
    if (claim.token_use !== 'access') throw new Error('Invalid token use')

    const context = { userID: claim.sub }
    return generatePolicy('user', 'Allow', event.methodArn, context)
}

function getRequest(uri: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(uri, (res) => {
            let body = ''
            res.on('data', (chunk) => { body += chunk })
            res.on('end', () => { resolve(body) })
            res.on('error', (err) => { reject(err) })
        })
    })
}

const generatePolicy = (principalId: string, effect: string, resource: string, context?: Context) => {
    return {
        principalId: principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: effect,
                    Action: 'execute-api:Invoke',
                    Resource: resource,
                }
            ]
        },
        context: context
    }
}