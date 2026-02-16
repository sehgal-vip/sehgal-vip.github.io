const { test, expect } = require('@playwright/test');

test.describe('Mermaid Editor Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/Online-Mermaid/');
    await page.waitForSelector('.mermaid-diagram-container svg', { timeout: 15000 });
  });

  test('SVG export works', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }),
      page.click('#exportSvgBtn'),
    ]);
    expect(download.suggestedFilename()).toMatch(/mermaid-diagram-\d+\.svg$/);
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('PNG export - diagnose failure', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Error') || text.includes('PNG') || text.includes('natural')) {
        consoleLogs.push(text);
      }
    });

    let dialogMessage = null;
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    const diagnose = await page.evaluate(() => {
      const svgEl = document.querySelector('.mermaid-diagram-container svg');
      if (!svgEl) return { error: 'No SVG found' };

      const dims = {};
      dims.widthAttr = svgEl.getAttribute('width');
      dims.heightAttr = svgEl.getAttribute('height');
      dims.viewBox = svgEl.getAttribute('viewBox');
      dims.bbox = (() => {
        try {
          const b = svgEl.getBBox();
          return b ? { width: b.width, height: b.height } : null;
        } catch (e) {
          return { error: String(e) };
        }
      })();

      const clone = svgEl.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

      const viewBox = svgEl.getAttribute('viewBox');
      let width = 800;
      let height = 600;
      if (viewBox) {
        const parts = viewBox.split(/\s+|,/);
        if (parts.length >= 4) {
          width = parseFloat(parts[2]);
          height = parseFloat(parts[3]);
        }
      }
      dims.computed = { width, height };

      const svgString = new XMLSerializer().serializeToString(clone);
      const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const result = {
            ...dims,
            imgNaturalWidth: img.naturalWidth,
            imgNaturalHeight: img.naturalHeight,
            imgComplete: img.complete,
            canvasTest: null,
          };

          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, img.naturalWidth || width);
            canvas.height = Math.max(1, img.naturalHeight || height);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png');
            result.canvasSuccess = !!dataUrl;
          } catch (e) {
            result.canvasError = String(e);
          }
          resolve(result);
        };
        img.onerror = () => {
          resolve({ ...dims, imgError: 'Image failed to load' });
        };
        img.src = dataUri;
      });
    });

    console.log('PNG export diagnose:', JSON.stringify(diagnose, null, 2));
    if (dialogMessage) console.log('Dialog shown:', dialogMessage);
    if (consoleLogs.length) console.log('Console:', consoleLogs);

    expect(diagnose).toBeDefined();
    if (diagnose.canvasError) {
      throw new Error('Canvas error: ' + diagnose.canvasError);
    }
    if (diagnose.imgError) {
      throw new Error('Image load error: ' + diagnose.imgError);
    }
    expect(diagnose.canvasSuccess).toBe(true);
  });

  test('PNG export triggers download', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.click('#exportPngBtn'),
    ]);
    expect(download.suggestedFilename()).toMatch(/mermaid-diagram-\d+\.png$/);
  });
});
