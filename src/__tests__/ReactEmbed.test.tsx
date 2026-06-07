/* eslint-disable testing-library/no-node-access */
import { vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';

import ReactEmbed, { type TransformAttributesMap } from '../ReactEmbed';

let instanceNumber = 0;

type TestElementFactoryProps = {
  Component?: React.ComponentType | string;
  attributes?: Record<
    string,
    string | { elementPropertyName: string; reactPropertyName: string }
  >;
  name?: string;
  properties?: Record<string, string>;
  // using any since it's made to apply to several different test cases
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformAttributes?: TransformAttributesMap<any>;
};

const testElementFactory = ({
  attributes = {},
  properties = {},
  Component = 'div',
  name = `test-element-${instanceNumber++}`,
  transformAttributes = {},
}: TestElementFactoryProps) => {
  class TestElement extends ReactEmbed {
    static get attributesMap() {
      return attributes;
    }

    static get propertiesMap() {
      return properties;
    }

    static get transformAttributes() {
      return transformAttributes;
    }

    static get Component() {
      return Component;
    }
  }

  customElements.define(name, TestElement);
  return new TestElement();
};

describe('ReactEmbed', () => {
  it('should have the right base methods and attributes', () => {
    customElements.define('react-embed', ReactEmbed);
    const reactEmbedInstance = new ReactEmbed();
    const readComponent = () => {
      return reactEmbedInstance.Component;
    };

    expect(reactEmbedInstance).toHaveProperty('attributesMap', {});
    expect(reactEmbedInstance).toHaveProperty('propertiesMap', {});
    expect(ReactEmbed.attributesMap).toEqual({});
    expect(ReactEmbed.propertiesMap).toEqual({});
    expect(ReactEmbed.observedAttributes).toEqual([]);
    expect(readComponent).toThrow("'Component' not implemented");
  });

  it('should update the inner props related to attributes (setAttribute)', async () => {
    const testElement = testElementFactory({
      attributes: {
        name: 'name',
      },
      Component: (({ name }) => {
        return <div>Test component {name}</div>;
      }) as React.ComponentType<unknown>,
    });
    const testName = `test${Math.random()}`;
    act(() => {
      document.body.appendChild(testElement);
    });
    act(() => {
      testElement.setAttribute('name', testName);
    });
    await waitFor(() => {
      expect(testElement).toHaveTextContent(`Test component ${testName}`);
    });
    expect(testElement.getAttribute('name')).toBe(testName);
  });

  it('should update the inner props related to attributes (direct assignment)', async () => {
    const testElement = testElementFactory({
      attributes: {
        name: 'name',
      },
      Component: (({ name }) => {
        return <div>Test component {name}</div>;
      }) as React.ComponentType<unknown>,
    });
    const testName = `test${Math.random()}`;
    act(() => {
      document.body.appendChild(testElement);
    });
    act(() => {
      testElement.name = testName;
    });
    await waitFor(() => {
      expect(testElement).toHaveTextContent(`Test component ${testName}`);
    });
    expect(testElement.name).toBe(testName);
  });

  it('should update the inner props related to properties', async () => {
    const testElement = testElementFactory({
      properties: {
        name: 'name',
      },
      Component: (({ name }) => {
        return <div>Test component {name}</div>;
      }) as React.ComponentType<unknown>,
    });
    const testName = `test${Math.random()}`;
    act(() => {
      document.body.appendChild(testElement);
    });
    act(() => {
      testElement.name = testName;
    });
    await waitFor(() => {
      expect(testElement).toHaveTextContent(`Test component ${testName}`);
    });
  });

  it('should trigger event handlers when called from within the component', async () => {
    const testElement = testElementFactory({
      properties: {
        onClick: 'onClick',
      },
      Component: (({ onClick }) => {
        return (
          <div>
            <button onClick={onClick}>Test component</button>
          </div>
        );
      }) as React.ComponentType<unknown>,
    });
    const onClick = vi.fn();
    act(() => {
      document.body.appendChild(testElement);
    });
    act(() => {
      testElement.onClick = onClick;
    });
    await waitFor(() => {
      expect(testElement).toHaveTextContent('Test component');
    });
    // intentionally accessing to the node method for the test
    const button = testElement.querySelector('button');
    act(() => {
      button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onClick).toHaveBeenCalled();
  });

  it('should fetch the styles when specified', () => {
    const testElement = testElementFactory({});
    testElement.setAttribute('stylesheet', 'https://example.com/styles.css');
    act(() => {
      document.body.appendChild(testElement);
    });

    const styleLink = document.head.querySelector('link');
    expect(styleLink).toHaveAttribute('rel', 'stylesheet');
    expect(styleLink).toHaveAttribute('href', 'https://example.com/styles.css');
  });

  it('should use shadow DOM when specified', () => {
    const testElement = testElementFactory({});
    testElement.setAttribute('use-shadow-dom', 'true');
    testElement.setAttribute('stylesheet', 'https://example.com/styles.css');
    act(() => {
      document.body.appendChild(testElement);
    });

    expect(testElement.shadowRoot).not.toBeNull();
    const styleLink = testElement.shadowRoot!.querySelector('link');
    expect(styleLink).toHaveAttribute('rel', 'stylesheet');
    expect(styleLink).toHaveAttribute('href', 'https://example.com/styles.css');
  });
  // TODO: find a way to test the errors thrown by setting invalid attributes

  it('should parse the attributes by default before passing them to the component', async () => {
    const mockComponent = vi.fn(() => <div></div>);
    const testElement = testElementFactory({
      attributes: {
        'has-boolean-attribute-enabled': 'hasBooleanAttributeEnabled',
      },
      Component: mockComponent,
    });
    act(() => {
      document.body.appendChild(testElement);
    });
    act(() => {
      testElement.setAttribute('has-boolean-attribute-enabled', 'false');
    });
    await waitFor(() => {
      expect(mockComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          hasBooleanAttributeEnabled: false,
        }),
        expect.anything(),
      );
    });
  });

  it('should stringify the attributes by default when setting them before updating the actual DOM', async () => {
    const testElement = testElementFactory({
      attributes: {
        'has-boolean-attribute-enabled': 'hasBooleanAttributeEnabled',
      },
      Component: (({ hasBooleanAttributeEnabled }) => {
        return <div>{JSON.stringify(hasBooleanAttributeEnabled)}</div>;
      }) as React.ComponentType<unknown>,
    });
    act(() => {
      document.body.appendChild(testElement);
    });
    act(() => {
      testElement['has-boolean-attribute-enabled'] = false;
    });
    await waitFor(() => {
      expect(testElement).toHaveTextContent('false');
    });
    expect(testElement.getAttribute('has-boolean-attribute-enabled')).toBe(
      'false',
    );
  });

  it.each([
    {
      transformAttributes: {
        title: (value: string) => value.toUpperCase(),
      },
      testId: 'default parse function',
    },
    {
      transformAttributes: {
        title: {
          parse: (value: string) => value.toUpperCase(),
          stringify: (value: string) => value.toLowerCase(),
        },
      },
      testId: 'object with parse and stringify',
    },
  ])(
    'should parse the attributes with the specified function before passing them to the component ($testId)',
    async ({ transformAttributes }) => {
      const mockComponent = vi.fn(() => <div></div>);
      const testElement = testElementFactory({
        attributes: {
          title: 'title',
        },
        transformAttributes,
        Component: mockComponent,
      });
      act(() => {
        document.body.appendChild(testElement);
      });
      act(() => {
        testElement.setAttribute('title', 'test');
      });
      await waitFor(() => {
        expect(mockComponent).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'TEST',
          }),
          expect.anything(),
        );
      });
    },
  );

  it('should stringify the attributes with the specified function before updating the actual DOM', async () => {
    const testElement = testElementFactory({
      attributes: {
        title: 'title',
      },
      transformAttributes: {
        title: {
          parse: (value) => value.toUpperCase(),
          stringify: (value) => value.toLowerCase(),
        },
      },
      Component: (({ title }) => {
        return <div>{title}</div>;
      }) as React.ComponentType<unknown>,
    });
    act(() => {
      document.body.appendChild(testElement);
    });
    act(() => {
      testElement.title = 'TEST';
    });
    await waitFor(() => {
      expect(testElement).toHaveTextContent('TEST');
    });
    expect(testElement.getAttribute('title')).toBe('test');
  });

  it('should set/get attribute through element property if specified', async () => {
    const testElement = testElementFactory({
      attributes: {
        'element-title': {
          reactPropertyName: 'title',
          elementPropertyName: 'elementTitle',
        },
      },
      Component: (({ title }) => {
        return <div>{title}</div>;
      }) as React.ComponentType<unknown>,
    });
    act(() => {
      document.body.appendChild(testElement);
    });

    act(() => {
      testElement.elementTitle = 'test';
    });

    await waitFor(() => {
      expect(testElement.getAttribute('element-title')).toBe('test');
      // both assertions might take time
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(testElement).toHaveTextContent('test');
    });
    // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
    expect(testElement.elementTitle).toBe('test');
  });

  it('should update props and attributes when the component is updated', async () => {
    const testElement = testElementFactory({
      attributes: {
        title: 'title',
      },
      properties: {
        label: 'label',
      },
      Component: (({ title, label }) => {
        return (
          <div>
            {title},{label}
          </div>
        );
      }) as React.ComponentType<unknown>,
    });
    const spyAddEventListener = vi.spyOn(testElement, 'addEventListener');
    act(() => {
      document.body.appendChild(testElement);
    });

    act(() => {
      testElement.title = 'test';
      testElement.label = 'label';
    });

    await waitFor(() => {
      expect(testElement).toHaveTextContent('test,label');
    });
    expect(spyAddEventListener).toHaveBeenCalledWith(
      'props',
      expect.any(Function),
    );

    act(() => {
      testElement.title = 'test2';
      testElement.label = 'label2';
    });

    await waitFor(() => {
      expect(testElement).toHaveTextContent('test2,label2');
    });
  });
});
