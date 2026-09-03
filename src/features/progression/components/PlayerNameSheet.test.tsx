import { fireEvent, render, screen } from '@testing-library/react-native';

import { PlayerNameSheet } from './PlayerNameSheet';

function renderSheet(currentName: string | null = null) {
  const onSave = jest.fn();
  const onClose = jest.fn();
  render(
    <PlayerNameSheet
      visible
      currentName={currentName}
      fallbackName="Valiant Scribe"
      onSave={onSave}
      onClose={onClose}
    />,
  );
  return { onSave, onClose };
}

describe('PlayerNameSheet', () => {
  it('saves a valid name in its canonical form', () => {
    const { onSave, onClose } = renderSheet();
    fireEvent.changeText(screen.getByTestId('player-name-input'), '  Harry   H ');
    fireEvent.press(screen.getByTestId('player-name-save'));
    expect(onSave).toHaveBeenCalledWith('Harry H');
    expect(onClose).toHaveBeenCalled();
  });

  it('explains why a name is rejected and refuses to save it', () => {
    const { onSave } = renderSheet();
    fireEvent.changeText(screen.getByTestId('player-name-input'), 'sh1t');
    expect(screen.getByTestId('player-name-hint')).toHaveTextContent('That name isn’t allowed');
    fireEvent.press(screen.getByTestId('player-name-save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('clearing the field reverts to the generated name', () => {
    const { onSave } = renderSheet('Harry');
    fireEvent.changeText(screen.getByTestId('player-name-input'), '');
    fireEvent.press(screen.getByText('Use generated name'));
    expect(onSave).toHaveBeenCalledWith(null);
  });
});
