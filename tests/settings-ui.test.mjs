import test from 'node:test';
import assert from 'node:assert/strict';
import { syncColorPreview } from '../settings-ui.mjs';

test('颜色预览会同步色块和十六进制文本', () => {
  const input = { value: '#4f8278' };
  const styles = new Map();
  const swatch = {
    style: {
      setProperty: (name, value) => styles.set(name, value)
    }
  };
  const valueLabel = { textContent: '' };

  syncColorPreview(input, swatch, valueLabel);

  assert.equal(styles.get('--preview-color'), '#4F8278');
  assert.equal(valueLabel.textContent, '#4F8278');
});
