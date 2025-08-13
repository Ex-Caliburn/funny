// import {html, css, LitElement} from 'lit';
import {
  html,
  css,
  LitElement,
  literal,
  unsafeStatic,
  templateContent,
  unsafeHTML,
  // hydrate,
} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/all/lit-all.min.js'
// } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js'

export class SimpleGreeting extends LitElement {
  static styles = css`
    p {
      color: blue;
    }
  `

  static properties = {
    name: { type: String },
    count: { type: Number }
  }

  constructor() {
    super()
    this.name = 'Somebody'
    this.count = 0
  }

  _click() {
    console.log(this.count)
    this.count += 1
  }

  render() {
    let greet = document.getElementById('greet')
    console.log(greet, '--' , greet.innerText, '--' ,greet.innerHTML)
    // html${unsafeStatic(greet.innerHTML)}
    console.log(html`${greet.innerHTML}`)
    return html`${greet.innerHTML}--`
    // return html`${hydrate(greet.innerHTML)}--
      // <p @click=${this._click}>Hello, ${this.name} ${this.count}!</p>`
  }
}
customElements.define('simple-greeting', SimpleGreeting)
