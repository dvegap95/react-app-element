/* eslint-disable @typescript-eslint/no-explicit-any */
import ReactDOM from 'react-dom/client';
import React from 'react';

import EventManager from './EventManager';

export type AttributesMap = Record<
  string,
  | string
  | {
      elementPropertyName: string;
      reactPropertyName: string;
    }
>;

export type TransformAttributesMap<T> = Record<
  string,
  | ((value: string, oldValue: string) => T)
  | {
      parse: (value: string) => T;
      stringify: (value: T) => string;
    }
>;

export type ReactEmbedConfigContextType = {
  styleRoot: HTMLHeadElement | ShadowRoot;
};

export const ReactEmbedConfigContext =
  React.createContext<ReactEmbedConfigContextType>({
    styleRoot: document.head,
  });

/**
 * Custom element for embedding React components.
 * Extend and redefine the static component getter to return the wrapped component.
 * Can declare properties and attributes to map to the component in {key: value} format.
 * The key is the property or attribute name and the value is the property name of the component it contains.
 * The attribute name should be lowercase.
 * Attributes are automatically observed and mapped to the component.
 * Properties are automatically mapped to the component.
 *
 * Attributes can be defined/modified from html or javascript and it's value will be handled as a string.
 * Properties can be defined/modified from javascript.
 * Properties map also accepts callbacks for events, the property name should start with 'on', followed by the event name in camel case.
 *
 * @example
 *
 * ```javascript
 * // my-react-component.js
 * class MyElement extends ReactEmbed {
 *    static get attributesMap() {
 *      return {
 *        product-name: 'productName'
 *      }
 *    }
 *
 *    static get propertiesMap() {
 *      return {
 *        value: 'value',
 *        readOnly: 'readOnly',
 *        onChange: 'onChange',
 *      }
 *    }
 *    static get Component() {
 *       return MyReactComponent
 *     }
 *  }
 *  customElements.define('my-element', MyElement)
 * ```
 *
 * @example
 *
 * ```html
 * <!-- index.html -->
 * <body>
 *  <my-element product="product1" value="value1" read-only></my-element>
 *  <script>
 *   document.addEventListener('props', (event) => {
 *      const element = document.querySelector('my-element')
 *      element.value = 'value 1' // element.value === 'value 1'
 *      element.setAttribute('product', 'product 1') // <my-element product="product 1"></my-element>
 *      element.product = 'product 2' // <my-element product="product 2"></my-element>
 *
 *      element.onChange = () => {
 *        console.log('changed')
 *        element.value = 'value 2'
 *      } // when triggered, should log 'changed' and element.value should be 'value 2'
 *    })
 * </script>
 * </body>
 * ```
 *
 * @abstract
 * @extends HTMLElement
 */
export default class ReactEmbed extends HTMLElement {
  // TODO: find a way to type this properly, at least based on templates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  useShadowDom: boolean;

  /**
   * Creates an instance of ReactEmbed element.
   *
   * @constructor
   * @param {boolean} [useShadowDom=false]
   */
  constructor(useShadowDom: boolean = false, styleFiles: string[] = []) {
    super();
    this._setupProperties();
    this._setupAttributes();
    this.useShadowDom = useShadowDom;
    this.styleFiles = styleFiles;
  }

  /**
   * Callback when the element is connected to the DOM.
   **/
  connectedCallback() {
    const useShadowDom = this.hasAttribute('use-shadow-dom')
      ? this.getAttribute('use-shadow-dom') === 'true'
      : this.useShadowDom;
    const root = useShadowDom ? this.attachShadow({ mode: 'open' }) : this;

    this._resolveStyles(useShadowDom);

    requestAnimationFrame(() => {
      const props = {
        ...this._attributes,
        ...this._properties,
      };

      ReactDOM.createRoot(root).render(
        <React.StrictMode>
          <ReactEmbedConfigContext.Provider
            value={{ styleRoot: useShadowDom ? root : document.head }}
          >
            <EventManager
              eventHandler={this}
              component={this.Component}
              {...props}
            />
          </ReactEmbedConfigContext.Provider>
        </React.StrictMode>,
      );
    });
  }

  _resolveStyles(useShadowDom: boolean = this.useShadowDom) {
    const stylesDir = this.getAttribute('styles-dir');
    const mainStyle = this.getAttribute('stylesheet');
    const styleFiles = this.styleFiles.map(
      (file: string) => `${stylesDir}/${file}`,
    );
    if (mainStyle) {
      styleFiles.unshift(`${mainStyle}`);
    }
    styleFiles.forEach((styleFile: string) => {
      this._attachStyles(useShadowDom, styleFile);
    });
  }

  /**
   * Attaches styles to the element.
   * @param {boolean} useShadowDom - Indicates whether to use Shadow DOM.
   * @param {string} styleSheetSrc - The source of the style sheet.
   * @private
   */
  _attachStyles(useShadowDom: boolean, styleSheetSrc: string) {
    if (styleSheetSrc) {
      const styleLink = document.createElement('link');
      styleLink.setAttribute('rel', 'stylesheet');
      styleLink.setAttribute('href', styleSheetSrc);
      if (useShadowDom) {
        this.shadowRoot!.appendChild(styleLink);
      } else {
        document.head.appendChild(styleLink);
      }
    }
  }

  /**
   * Sets up properties and attributes mapping.
   * @private
   */
  _setupProperties() {
    Object.keys(this.propertiesMap).forEach((key) => {
      if (Object.keys(this).includes(key)) {
        throw new Error(
          `Cannot use "${key}" as a property, it is already defined for this element.`,
        );
      }
      Object.defineProperty(this, key, {
        get() {
          return this[`_${key}`];
        },
        set(value) {
          this[`_${key}`] = value;
          this._updateProps({ [key]: value });
        },
        enumerable: true,
        configurable: false,
      });
    });
  }

  /**
   * Sets up attributes mapping.
   * @private
   */
  _setupAttributes() {
    Object.entries(this.attributesMap).forEach(([key, value]) => {
      const attributeName = key;
      const elementPropertyName =
        typeof value === 'string' ? attributeName : value.elementPropertyName;
      if (key !== key.toLowerCase()) {
        throw new Error(`Attributes must be lowercase, found: ${key}`);
      }
      if (Object.keys(this.propertiesMap).includes(elementPropertyName)) {
        throw new Error(
          `Cannot use "${elementPropertyName}" as an attribute and property at the same time.`,
        );
      }
      if (Object.keys(this).includes(key)) {
        throw new Error(
          `Cannot use "${key}" as an attribute, it is already defined for this element.`,
        );
      }
      Object.defineProperty(this, elementPropertyName, {
        get() {
          return this[`attr_${key}`];
        },
        set(value) {
          const transformAttribute = this._resolveTransformAttributeFunction(
            key,
            'stringify',
          );
          this[`attr_${key}`] = value;
          this.setAttribute(key, transformAttribute(value));
        },
        enumerable: true,
      });
    });
  }

  get _properties() {
    const properties: Record<string, unknown> = {};
    Object.values(this.propertiesMap).forEach((value) => {
      properties[value] = this[value];
    });
    return properties;
  }

  get _attributes() {
    const attributes: AttributesMap = {};
    Object.entries(this.attributesMap).forEach(([key, value]) => {
      const reactPropertyName =
        typeof value === 'string' ? value : value.reactPropertyName;
      attributes[reactPropertyName] = this[`attr_${key}`];
    });
    return attributes;
  }

  /**
   * Gets the static attribute list as an object which maps the attribute name to the property name of the react component it contains.
   * The external element attribute name is the key and the react component property name is the value.
   * The attribute name should be lowercase.
   * If the direct access to the attribute as an element's instance javascript property is needed to have a different name,
   * you can define it as an object with the keys 'reactPropertyName' and 'elementPropertyName'.
   *
   * @example
   * ```javascript
   * static get attributesMap() {
   * return {
   *  product-name: { // <my-element product-name="product1"></my-element>
   *    reactPropertyName: 'productName', // react component property name
   *    elementPropertyName: 'productName' // $('my-element').productName
   *  }
   * }
   * ```
   *
   *
   * @example
   * ```javascript
   * static get attributeList() {
   *  return {
   *   product-name: 'productName'
   *  }
   * }
   * ```
   *
   * @static
   * @readonly
   * @abstract
   * @type {{ [key: string]: string | { reactPropertyName: string, elementPropertyName: string }}
   */
  static get attributesMap(): AttributesMap {
    return {};
  }

  /**
   * Gets the properties for the element as an object which maps the property of the element to the component it contains.
   * The resultant element's external property name is the key and the react component property name is the value.
   * If it's an event, the property name should start with 'on', followed by the event name in camel case.
   *
   * @example
   * ```javascript
   * get properties() {
   *  return {
   *    value: 'value',
   *    readOnly: 'readOnly',
   *    onClose: 'onClose',
   *  }
   * }
   * ```
   *
   * @static
   * @readonly
   * @type {{ [key: string]: string }}
   */
  static get propertiesMap(): Record<string, string> {
    return {};
  }

  /**
   * Gets the observed attributes for the element.
   * @static
   * @readonly
   * @type {Array<string>}
   */
  static get observedAttributes() {
    return Object.keys(this.attributesMap);
  }

  /**
   * Gets the React component to be embedded.
   * @example
   *
   * ```javascript
   * static get Component() {
   *  return MyReactComponent
   * }
   * ```
   * @static
   * @readonly
   * @abstract
   *
   * @type {React.ComponentType<any> | string}
   */
  static get Component(): React.ComponentType | string {
    throw new Error("'Component' not implemented");
  }

  /**
   * Returns an object containing functions for transforming the attributes (string)
   * into it's analog react property accepted format.
   *
   * @returns {Object} The transformation attributes object.
   *
   * @example
   * ```javascript
   * static get transformAttributes() {
   *  return {
   *   'read-only': (value) => value === 'true', // assumed as parse function
   *    value: {
   *     parse: (value) => JSON.parse(value),
   *     stringify: (value) => JSON.stringify(value),
   *    }
   *  }
   * }
   * ```
   *
   * @static
   * @readonly
   *
   * @type {{ [key: string]: (value: string) => any | { parse: (value: string) => any, stringify: (value: any) => string } }}
   */
  static get transformAttributes(): TransformAttributesMap<any> {
    return {};
  }

  /**
   * @private
   */
  get attributesMap(): AttributesMap {
    return (this.constructor as typeof ReactEmbed).attributesMap;
  }

  /**
   * @private
   */
  get propertiesMap(): Record<string, string> {
    return (this.constructor as typeof ReactEmbed).propertiesMap;
  }

  /**
   * @private
   */
  get Component(): React.ComponentType | string {
    return (this.constructor as typeof ReactEmbed)
      .Component as unknown as React.ComponentType;
  }

  /**
   * Callback when attributes are changed.
   * @param {string} name - The attribute name.
   * @param {string} oldValue - The old attribute value.
   * @param {string} newValue - The new attribute value.
   */
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue && name in this.attributesMap) {
      const transformAttribute = this._resolveTransformAttributeFunction(
        name,
        'parse',
      );
      const oldParsedValue = this[`attr_${name}`];
      newValue = transformAttribute(newValue, oldParsedValue);
      this[`attr_${name}`] = newValue;
      this._updateProps({
        [(this.attributesMap as Record<string, string>)[name]]: newValue,
      });
    }
  }

  /**
   * Dispatches a CustomEvent to update props.
   * @param {Object} props - The props to update.
   * @private
   */
  _updateProps(props: Record<string, unknown>) {
    const event = new CustomEvent('props', {
      detail: { props },
    });
    this.dispatchEvent(event);
  }

  _resolveTransformAttributeFunction(
    attributeName: string,
    direction: 'parse' | 'stringify' = 'parse',
  ) {
    const targetDefinition = (this.constructor as typeof ReactEmbed)
      .transformAttributes[attributeName];
    if (typeof targetDefinition === 'function' && direction === 'parse') {
      return targetDefinition;
    }
    if (typeof targetDefinition === 'object') {
      return targetDefinition[direction];
    }

    // JSON.parse receives any type, as it's argument
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (value: any) => {
      let ret;
      try {
        if (direction === 'parse') {
          ret = JSON.parse(value);
        }
        if (direction === 'stringify') {
          ret = typeof value === 'string' ? value : JSON.stringify(value);
        }
      } catch (e) {
        ret = value;
      }
      return ret;
    };
  }
}
