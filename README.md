# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **S# Dealshub Astro Project

This project is a static site built with [Astro](https://astro.build/). It is configured for automated deployment to the GCP server at `35.212.202.252`.

## Deployment

The `sync.ps1` script handles both the build and deployment in one step.

### How to Deploy
1. Ensure your SSH key is available at the path defined in `.env`.
2. Run the deployment script:
   ```powershell
   .\sync.ps1
   ```

The script will:
1. Run `npm run build` to generate the `dist/` folder.
2. Use `scp` to upload the contents of `dist/` to `/var/www/dealshubindia.in/htdocs` on the GCP server.

## Local Development
Run the Astro dev server:
```bash
npm run dev
```

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
