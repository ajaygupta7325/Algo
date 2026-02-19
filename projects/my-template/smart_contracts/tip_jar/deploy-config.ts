import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { TipJarFactory } from '../artifacts/tip_jar/TipJarClient'

/**
 * Deploy the TipJar smart contract
 * This handles creation of the contract and initial funding
 */
export async function deploy() {
  console.log('=== Deploying TipJar (Content Creator Tip Jar) ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(TipJarFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({
    onUpdate: 'append',
    onSchemaBreak: 'append',
    createParams: {
      method: 'createApplication',
      args: [],
    },
  })

  // If app was just created, fund the app account for inner transactions
  if (['create', 'replace'].includes(result.operationPerformed)) {
    console.log(`TipJar app created with ID: ${appClient.appClient.appId}`)
    console.log(`TipJar app address: ${appClient.appAddress}`)

    // Fund the contract account so it can send inner transactions (tips to creators)
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
    console.log('Funded TipJar contract with 1 ALGO for inner transactions')
  }

  // Verify deployment by reading platform stats
  const statsResponse = await appClient.send.getPlatformStats({ args: [] })
  console.log(`Platform total tips processed: ${statsResponse.return} microALGO`)

  const creatorsResponse = await appClient.send.getTotalCreators({ args: [] })
  console.log(`Total registered creators: ${creatorsResponse.return}`)

  const minTipResponse = await appClient.send.getMinTipAmount({ args: [] })
  console.log(`Minimum tip amount: ${minTipResponse.return} microALGO (${Number(minTipResponse.return) / 1_000_000} ALGO)`)

  const feeResponse = await appClient.send.getPlatformFee({ args: [] })
  console.log(`Platform fee: ${Number(feeResponse.return) / 100}%`)

  // Verify new enhanced features
  const badgeResponse = await appClient.send.getTotalBadgesMinted({ args: [] })
  console.log(`Total badges minted: ${badgeResponse.return}`)

  const thresholdResponse = await appClient.send.getBronzeThreshold({ args: [] })
  console.log(`Bronze badge threshold: ${Number(thresholdResponse.return) / 1_000_000} ALGO`)

  console.log('=== TipJar Deployment Complete (Enhanced Version) ===')
  console.log('Features: NFT Badges, Revenue Split, On-Chain Verification, Analytics')
  console.log(`App ID: ${appClient.appClient.appId}`)
  console.log(`App Address: ${appClient.appAddress}`)
}
