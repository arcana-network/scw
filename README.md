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
<a href="https://docs.beta.arcana.network/"><img src="https://raw.githubusercontent.com/arcana-network/branding/main/an_banner_docs.png" alt="Arcana Gasless SDK"/></a>
</p>

# Gasless (Standalone) SDK

Arcana Gasless feature is available as a standalone SDK for Web3 apps that require to enable gasless feature. Install and integrate your app to enable gasless transactions.

When using the [Arcana Auth SDK](https://www.npmjs.com/package/@arcana/auth), the gasless feature is built-in and automatically available in the Arcana wallet.  Arcana wallet users can benefit by not having to pay gas fees for all the app operations that are whitelisted by the developer.

If the app wishes to enable gasless transactions in third-party browser-based wallets, in addition to the Arcana wallet (embedded, non-custodial wallet within the Auth SDK), then they also need to install and integrate the app with standalone gasless SDK.

Also, if the app does not wish to user any user onboarding feature or Arcana wallet offered by the Auth SDK, they can simply integrate directly with the gasless standalone SDK for enabling gasless transactions via any third-party browser-based wallets.

## Use Cases

1. Enabling gasless operations in multi-wallet apps that support other third party wallets besides the embedded, non-custodial Arcana wallet.

2. Enabling gasless operations in apps that use third party wallets but not the Arcana wallet or do not require the onboarding feature of the Arcana Auth SDK.

## Supported Blockchains

Arcana Network gasless SDK is powered by Biconomy and supported for all the blockchain networks that Biconomy supports.

## Installation

## npm

```sh
npm install --save @arcana/scw
```

## Prerequisites

Before you can start using the Arcana Gasless SDK, you need to register your dApp using [Arcana Developer Dashboard](https://dashboard.arcana.network/).

A unique **App Address** will be assigned to your dApp and you need the same to initialize the Arcana Gasless SDK.  In addition, developers must also configure gas tanks, whitelist app operations that must be enabled as gasless.  These configuration settings can be handled via the Arcana Developer Dashboard.

# 📚 Documentation

Check out [Arcana Network documentation](https://docs.arcana.network/) for [Gasless SDK Quick Start Guide](https://docs.arcana.network/quick-start/gasless-quick-start.html), [Gasless Usage Guide](https://docs.arcana.network/gasless-sdk/gasless-usage-guide.html).

# 💡 Support

For any support or integration-related queries, [contact us](https://docs.arcana.network/support.html).

# ℹ️ License

Arcana Gasless SDK is distributed under the [MIT License](https://fossa.com/blog/open-source-licenses-101-mit-license/).

For details see [Arcana License](https://github.com/arcana-network/license/blob/main/LICENSE.md).
