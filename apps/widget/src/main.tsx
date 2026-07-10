import { createRoot } from 'react-dom/client';
import Widget from './Widget';
// @ts-ignore - Vite CSS modules injection
import stylesText from './Widget.module.css?inline';

class WenzaPayWidget {
  private container: HTMLElement | null = null;
  private root: any = null;

  constructor() {
    this.init();
  }

  private init() {
    // Find the script tag that loaded this to get data attributes
    const scripts = document.getElementsByTagName('script');
    let currentScript = null;
    
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].getAttribute('data-wpay-key')) {
        currentScript = scripts[i];
        break;
      }
    }

    if (!currentScript) {
      console.error('WenzaPay: Missing script tag with data-wpay-key attribute');
      return;
    }

    const apiKey = currentScript.getAttribute('data-wpay-key') || '';
    const amount = currentScript.getAttribute('data-amount') || '0';
    const currency = currentScript.getAttribute('data-currency') || 'USD';
    const reference = currentScript.getAttribute('data-ref') || '';
    
    // In dev, use localhost API. In prod, point to actual API URL
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    this.container = document.createElement('div');
    this.container.id = 'wenzapay-widget-container';
    
    // Insert after the script tag
    currentScript.parentNode?.insertBefore(this.container, currentScript.nextSibling);

    const shadowRoot = this.container.attachShadow({ mode: 'open' });
    
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = stylesText;
    shadowRoot.appendChild(styleEl);

    const reactRootEl = document.createElement('div');
    shadowRoot.appendChild(reactRootEl);

    this.root = createRoot(reactRootEl);
    this.root.render(
      <Widget 
        apiKey={apiKey} 
        amount={amount} 
        currency={currency} 
        reference={reference} 
        apiBaseUrl={apiBaseUrl} 
      />
    );

    // Expose global API
    // @ts-ignore
    window.WenzaPay = {
      open: () => {
        if (this.container) this.container.style.display = 'block';
      },
      close: () => {
        if (this.container) this.container.style.display = 'none';
      },
      dispatchEvent: (eventName: string, payload: any) => {
        const event = new CustomEvent(eventName, { detail: payload });
        window.dispatchEvent(event);
      },
      on: (eventName: string, callback: (payload: any) => void) => {
        window.addEventListener(eventName, (e: any) => callback(e.detail));
      }
    };
  }
}

// Auto-initialize when loaded
new WenzaPayWidget();
