<p align="center">
<a href="#start"><img height="30rem" src="https://raw.githubusercontent.com/arcana-network/branding/main/an_logo_light_temp.png"/></a>
<h2 align="center"> <a href="https://arcana.network/">Arcana Network Gasless SDK </a></h2>
</p>
<br/>
<p id="banner" align="center">
<br/>
<a title="MIT License" href="https://github.com/arcana-network/license/blob/main/LICENSE.md"><img src="https://img.shields.io/badge/license-MIT-blue"/></a>
<a title="Beta release" href="https://github.com/arcana-network/scw/releases"><img src="https://img.shields.io/github/v/release/arcana-network/scw?style=flat-square&color=28A745"/></a>
<a title="Twitter" href="https://twitter.com/ArcanaNetwork"><img alt="Twitter URL" src="https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Ftwitter.com%2FArcanaNetwork"/></a>
<a title="CodeCov" href="https://codecov.io/gh/arcana-network/scw"> 
 <img src="https://codecov.io/gh/arcana-network/scw/branch/main/graph/badge.svg?token=KmdjEs3enL"/></a>
</p><p id="start" align="center">
<a href="https://docs.beta.arcana.network/"><img src="https://raw.githubusercontent.com/arcana-network/branding/main/an_gasless_sdk_banner_feb_24.png" alt="Arcana Gasless SDK"/></a>
</p>

# Gasless (Standalone) SDK

The Gasless (Standalone) SDK extends the Arcana wallet's gasless transaction capability to third-party wallets.

Web3 apps that require gasless transactions in third-party wallets can integrate with this SDK. To enable gasless transactions in third-party wallets and the Arcana wallet, apps must also integrate with the Auth SDK.

## Supported Blockchains

The Gasless SDK integrates with third-party gasless providers such as Biconomy to provide gasless transactions. See the [list of blockchains](https://docs.arcana.network/state-of-the-arcana-auth#arcana-gasless-standalone-sdk) that support gasless transactions.

## Prerequisites

1. Register the app through the [Arcana Developer Dashboard](https://dashboard.arcana.network/) and obtain a unique client ID.

2. Use the dashboard to add and fund gas tanks. Select white-listed app operations that will incur zero gas fees for the users. Not all supported blockchain networks may allow gasless transactions.

3. Install the Gasless SDK and use the client ID to integrate the app. [Learn more...](https://docs.arcana.network/quick-start/gasless-standalone-quick-start)

## Installation

## npm

```sh
npm install --save @arcana/scw
```

## Documentation

See [Arcana Network documentation](https://docs.arcana.network/), [Gasless SDK Quick Start Guide](https://docs.arcana.network/quick-start/gasless-quick-start.html), [Gasless Usage Guide](https://docs.arcana.network/gasless-sdk/gasless-usage-guide.html) and [integration examples](https://docs.arcana.network/tutorials/).

## Support

For any support or integration-related queries, [contact us](https://docs.arcana.network/support.html).

## License

Arcana Gasless SDK is distributed under the [MIT License](https://fossa.com/blog/open-source-licenses-101-mit-license/). For details, see [Arcana License](https://github.com/arcana-network/license/blob/main/LICENSE.md).
