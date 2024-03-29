# iSpindel Multiservice

Send your [iSpindel](https://www.ispindel.de/docs/README_en.html) data to multiple services like [Ubidots](http://help.ubidots.com/en/articles/3979278-connect-the-ispindel-low-cost-diy-hydrometer-with-ubidots), [Brewfather](https://docs.brewfather.app/integrations/ispindel), [Grainfather](https://grainfather.com/), [Brewers Friend](https://www.brewersfriend.com/), [Home Assistant](https://www.home-assistant.io/), and more.

- [Usage](#usage)
  - [Configuration](#configuration)
    - [Primary Configuration Options](#primary-configuration-options)
    - [Using Environment Variables in `config.json`](#using-environment-variables-in-configjson)
  - [Running the Server](#running-the-server)
  - [Running the Server for Development](#running-the-server-for-development)
- [FAQ](#faq)
  - [What does this do?](#what-does-this-do)
  - [Why would I need it?](#why-would-i-need-it)
  - [Which services are supported?](#which-services-are-supported)


## Usage

### Configuration

Configuration is stored in JSON format. A minimal configuration to send iSpindel data to an http service would look something like:

```json
{
  "serverPath": "/mySpindel",
  "services": [
    {
      "type": "http",
      "url": "http://example.com/endpoint"
    }
  ]
}
```

In this example the server would listen on the path `/mySpindel` and forward the iSpindel data to `http://example.com/endpoint`.

See [`config.example.json`](./config.example.json) for reference.

By default, the server will look for a `config.json` file in the root of this project to configure the services to send your iSpindel data to. This can be overriden by setting the `CONFIG_FILE_PATH` to the full file system path of your configuration file.

#### Primary Configuration Options

* `serverPath` (optional) - the path for the server. If ommitted, the server will listen at the root.
* `services` (required) - an array of service objects (see [`config.example.json`](./config.example.json)):
  * `type` (required) - one of:
    * `http` - the main service which can be used to send data over HTTP or HTTPS:
    * `ubidots` - Ubidots
    * `homeassistant` - Home Assistant
  * `url` (required) - the URL to send to
  * `deviceLabel` (optional) - rename the device from what is configured in the iSpindel. Used for services like GrainFather and Brewfather which require a specific string in the name when using SG instead of Plato.
  * `headers` (optional) - a key-value object of headers and header values to send with the request
  * `token` (optional) - the API token to send in the request for supported services (currently only used for `ubidots` and `homeassistant`)

#### Using Environment Variables in `config.json`

Since the configuration may store sensitive information, it is a good idea to use environment variables for this info instead of storing it in `config.json`. This allows you to version control your config without worrying about leaking keys or secrets.

To allow this, we use [envsub](https://www.npmjs.com/package/envsub) for environment variable substitution using the `${MYVAR}` format. For example, if you were using `ubidots` as a serivce, and set your Ubidots token in the `UBIDOTS_TOKEN` environment variable, your `config.json` would look something like:

```json
{
  "serverPath": "/mySpindel",
  "services": [
    {
      "type": "ubidots",
      "deviceLabel": "iSpindel",
      "token": "${UBIDOTS_TOKEN}"
    }
  ]
}
```

### Running the Server

Deploy to your favorite node.js hosting service (see guide for [deploying to Render](./DEPLOY-RENDER.md)).

```
yarn
yarn start
```

The server will listen on the port specified with the `PORT` environment variable or 8080 if not set.

### Running the Server for Development

```
git clone https://github.com/chrisscott/iSpindel-multiservice
cd iSpindel-multiservice
yarn install
yarn run dev
```

The server will listen on the port specified with the `PORT` environment variable or 8080 if not set.

## FAQ

### What does this do?

Provides a service you can point your iSpindel to which then forwards the data to one or more supported services.

### Why would I need it?

* You have an iSpindel and want to send data to Ubidots, Grainfather, Brewers Friend, a custom HTTP service, Home Assistant or more. 
* You are on an old iSpindel firmware without HTTPS support want to send iSpindel data to a service that only supports HTTPS.

### Which services are supported?

Currently, the following:
* HTTP - any HTTP or HTTPS endpoint
  * Header-based token authentication is supported
* Ubidots
* Home Assistant

If there is a service missing you'd like to see, please [submit an issue](/issue/new) with the details.
