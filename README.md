# @dvegap95/react-embed

Web component base class for embedding React applications inside any HTML page or host application.

Published from this standalone repository. The [lerna-vite-monorepo-template](https://github.com/dvegap95/lerna-vite-monorepo-template) vendors a copy for zero-config bootstrapping — swap it for this package when ready.

## Install

```bash
yarn add @dvegap95/react-embed
# peer deps
yarn add react react-dom
```

## Usage

```ts
import ReactEmbed from '@dvegap95/react-embed';
import App from './App';

class MyAppElement extends ReactEmbed {
  static get Component() {
    return App;
  }

  static get attributesMap() {
    return { 'base-path': 'basePath' };
  }
}

customElements.define('my-app', MyAppElement);
```

```html
<my-app base-path="/apps/my-app/"></my-app>
```

## Development

```bash
yarn install
yarn test
yarn build
```

## License

MIT
