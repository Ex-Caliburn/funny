import {LitElement, html} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';
import {consume} from '@lit-labs/context';
import {Logger, loggerContext} from './logger.js';

export class MyElement extends LitElement {
  @consume({context: loggerContext, subscribe: true})
  static properties = {
    version: {},
  };

  constructor() {
    super();
    this.version = 'STARTING';
  }

  render() {
    return html`
    <p>Welcome to the Lit tutorial!</p>
    <p>This is the ${this.version} code.</p>
    `;
  }
}
customElements.define('my-element', MyElement);
