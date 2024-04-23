import { useSnapshot } from 'valtio';
import { fireEvent, render } from '@testing-library/react';
import { proxyWithPersister } from '../persister';
import * as React from 'react';

const initialState = {
  counter: 0,
};
const persisterName = 'test-storage';

describe('proxyWithPersister', () => {
  test('proxyWithPersister should persist data on localStorage', async () => {
    const { store } = proxyWithPersister(initialState, {
      name: persisterName,
    });

    const Counter = () => {
      const snap = useSnapshot(store);

      return (
        <>
          <div>count: {snap.counter}</div>
          <button
            onClick={() => {
              ++store.counter;
            }}
          >
            button
          </button>
        </>
      );
    };

    const { getByText, findByText, unmount } = render(
      <React.StrictMode>
        <Counter />
      </React.StrictMode>
    );

    await findByText('count: 0');

    fireEvent.click(getByText('button'));
    await findByText('count: 1');

    unmount();
  });
  test('proxyWithPersister should hydrate data from localStorage', async () => {
    const { store } = proxyWithPersister(initialState, {
      name: persisterName,
    });

    const Counter = () => {
      const snap = useSnapshot(store);

      return (
        <>
          <div>count: {snap.counter}</div>
        </>
      );
    };

    const { findByText, unmount } = render(
      <React.StrictMode>
        <Counter />
      </React.StrictMode>
    );

    await findByText('count: 1');

    unmount();
  });
  test('proxyWithPersister should not persist excluded keys to localStorage', async () => {
    const excludedKeys = ['excludedKey'];

    const state = {
      ...initialState,
      excludedKey: 'excludeValue',
    };

    const { store } = proxyWithPersister(state, {
      name: persisterName,
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => !excludedKeys.includes(key))
        ) as typeof state,
    });

    await Promise.resolve();

    expect(store).toStrictEqual({ ...state, counter: 0 });
    expect(localStorage.getItem(persisterName)).toStrictEqual(
      JSON.stringify({
        state: { counter: 1 },
        version: 0,
      })
    );
    expect(localStorage.length).toBe(1);
  });
  test('proxyWithPersister should migrate from version 0 to version 1', async () => {
    const state: {
      counter?: number;
      newCounter: number;
    } = {
      newCounter: 0,
    };

    const { store } = proxyWithPersister(state, {
      name: persisterName,
      version: 1,
      migrate(persistedState, version) {
        if (version === 0) {
          // if the stored value is in version 0, we rename the field to the new name
          persistedState.newCounter = persistedState.counter ?? 0;
          delete persistedState.counter;
        }

        return persistedState;
      },
    });

    ++store.newCounter;

    await Promise.resolve();

    expect(store).toStrictEqual({ newCounter: 1 });
    expect(localStorage.getItem(persisterName)).toStrictEqual(
      JSON.stringify({
        state: { newCounter: 1 },
        version: 1,
      })
    );
    expect(localStorage.length).toBe(1);
  });
});
