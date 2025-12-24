# Deploying to Render
This guide covers how to deploy this project to [Render](https://render.com/). You can use their free tier or a paid tier.

- [Fork This Repository](#fork-this-repository)
- [Sign Up for Render](#sign-up-for-render)
- [Create Your Config File](#create-your-config-file)
- [Create a New Render Web Service](#create-a-new-render-web-service)
  - [Enviroment Variables](#enviroment-variables)
  - [Secret Files](#secret-files)
- [Notes](#notes)


## Fork This Repository
[Fork this repo](https://github.com/chrisscott/iSpindel-multiservice/fork) to your account. This will be used to deploy to Render.

## Sign Up for Render
[Sign up for a render account](https://dashboard.render.com/register).

## Create Your Config File
Add a new file, `config.render.json` in the root of your forked repo and [add your configuration](https://github.com/chrisscott/iSpindel-multiservice#configuration) to it.

This file is git ignored and will not be stored in git but used later when setting up Render.

## Create a New Render Web Service
[Follow the Render docs](https://render.com/docs/web-services#deploying-from-a-git-repository) to create a new web service. 

Accept the defaults except for the **Start Command** which needs to be set to `pnpm start`.

When you get to the end of Step 4, add the following Advanced settings:

### Enviroment Variables 
| Key                | Value                             |
| ------------------ | --------------------------------- |
| `CONFIG_FILE_PATH` | `/etc/secrets/config.render.json` |

### Secret Files
| Filename             | Contents                                    |
| -------------------- | ------------------------------------------- |
| `config.render.json` | Copy/Paste contents of `config.render.json` |

Once the web service is saved it will be deployed and available on the URL noted in the Render Dashboard.

## Notes
If you update your config file you will need to update the Secret File contents in the Render Dashboard for the project.
