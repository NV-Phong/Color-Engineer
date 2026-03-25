// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// Helper functions defined at the top so they can be reused
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  h /= 360;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [r, g, b];
}

function changeHueImpl(color: RGB, targetHue: number): RGB {
  const [h, s, l] = rgbToHsl(color.r, color.g, color.b);
  const [newR, newG, newB] = hslToRgb(targetHue, s, l);
  return { r: newR, g: newG, b: newB };
}

function fastClone(val: any): any {
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    const res = new Array(val.length);
    for (let i = 0; i < val.length; i++) {
      res[i] = fastClone(val[i]);
    }
    return res;
  }
  if (val instanceof Uint8Array) return new Uint8Array(val);
  
  const res: any = {};
  for (const key in val) {
    res[key] = fastClone(val[key]);
  }
  return res;
}

function getNodesWithColors(selection: readonly SceneNode[]): SceneNode[] {
  const result: SceneNode[] = [];
  function traverse(node: SceneNode) {
    if ('fills' in node || 'strokes' in node) {
      result.push(node);
    }
    if ('children' in node) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }
  for (const node of selection) {
    traverse(node);
  }
  return result;
}

// Runs this code if the plugin is run in Figma
if (figma.editorType === 'figma') {
  let isIndividualMode = false;

  function getSpectrum(h: number, s: number, l: number): string | null {
    if (s < 0.05 || l < 0.05 || l > 0.95) return null; // Ignore mostly gray/black/white
    if (h >= 345 || h < 15) return 'Red';
    if (h >= 15 && h < 45) return 'Orange';
    if (h >= 45 && h < 75) return 'Yellow';
    if (h >= 75 && h < 150) return 'Green';
    if (h >= 150 && h < 240) return 'Blue';
    if (h >= 240 && h < 275) return 'Indigo';
    if (h >= 275 && h < 345) return 'Violet';
    return null;
  }

  function getSpectrumBaseHue(name: string): number {
    switch (name) {
      case 'Red': return 0;
      case 'Orange': return 30;
      case 'Yellow': return 60;
      case 'Green': return 120;
      case 'Blue': return 210;
      case 'Indigo': return 260;
      case 'Violet': return 300;
      default: return 0;
    }
  }

  function analyzeAndSendColors() {
    const allNodes = getNodesWithColors(figma.currentPage.selection);
    const spectrumsMap = new Map<string, {h: number, s: number, l: number}>();
    const seenColors = new Set<number>(); // Bộ nhớ đệm giúp bỏ qua nhanh các màu trùng lặp

    function processColor(c: RGB) {
      // Mã hóa RGB thành 1 số integer duy nhất để tra cứu siêu tốc (Bitwise)
      const r = Math.round(c.r * 255);
      const g = Math.round(c.g * 255);
      const b = Math.round(c.b * 255);
      const key = (r << 16) | (g << 8) | b;

      if (seenColors.has(key)) return;
      seenColors.add(key);

      const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
      const spec = getSpectrum(h, s, l);
      if (spec && !spectrumsMap.has(spec)) {
        spectrumsMap.set(spec, { h: Math.round(h), s, l });
      }
    }

    for (const node of allNodes) {
      if ('fills' in node && Array.isArray(node.fills)) {
        for (const fill of node.fills) {
          if (fill.type === 'SOLID') processColor(fill.color);
          else if (fill.type.startsWith('GRADIENT_')) {
            for (const stop of fill.gradientStops) processColor(stop.color);
          }
        }
      }
      if ('strokes' in node && Array.isArray(node.strokes)) {
        for (const stroke of node.strokes) {
          if (stroke.type === 'SOLID') processColor(stroke.color);
        }
      }
    }

    const uniqueColors = Array.from(spectrumsMap.entries()).map(([key, val]) => {
      // Use standard colors for the UI display
      const baseHue = getSpectrumBaseHue(key);
      const [r, g, b] = hslToRgb(baseHue, 1, 0.5);
      return {
        key: key,
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
        h: baseHue,
        s: 1,
        l: 0.5
      };
    });

    // Sort them by Base Hue order
    uniqueColors.sort((a, b) => getSpectrumBaseHue(a.key) - getSpectrumBaseHue(b.key));

    figma.ui.postMessage({ type: 'analyzed-colors', colors: uniqueColors });
  }

  figma.on('selectionchange', () => {
    if (isIndividualMode) {
      analyzeAndSendColors();
    }
  });

  figma.showUI(__html__, { width: 320, height: 260, themeColors: true });

  figma.ui.onmessage = async msg => {
    if (msg.type === 'resize') {
      // Bounding fix: make sure width is sent back, and allow a flexible max height constraint.
      figma.ui.resize(320, Math.round(msg.height));
      return;
    }

    if (msg.type === 'set-mode') {
      isIndividualMode = msg.isIndividual;
      if (isIndividualMode) {
        analyzeAndSendColors();
      }
      return;
    }

    if (msg.type === 'change-hue') {
      const allNodes = getNodesWithColors(figma.currentPage.selection);
      
      if (allNodes.length === 0) {
        figma.notify('No colorable objects found in selection');
        figma.ui.postMessage({ type: 'complete' });
        return;
      }

      const mode = msg.mode;
      const globalHue = msg.hue;
      const hueMap = msg.hueMap;
      
      const colorCache = new Map<number, RGB | null>(); // Bộ nhớ đệm giữ thông tin đổi màu để không phải tính lại

      function transformColor(c: RGB): RGB | null {
        // Dùng Bitwise để tạo key tra cứu cực nhanh
        const r = Math.round(c.r * 255);
        const g = Math.round(c.g * 255);
        const b = Math.round(c.b * 255);
        const cacheKey = (r << 16) | (g << 8) | b;

        if (colorCache.has(cacheKey)) {
          return colorCache.get(cacheKey) || null;
        }

        let result: RGB | null = null;
        if (mode === 'individual') {
          const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
          const spec = getSpectrum(h, s, l);
          if (spec && hueMap[spec] !== undefined) {
             result = changeHueImpl(c, hueMap[spec]);
          }
        } else {
          result = changeHueImpl(c, globalHue);
        }
        
        colorCache.set(cacheKey, result);
        return result;
      }

      const totalNodes = allNodes.length;
      let count = 0;
      let lastYieldTime = Date.now();

      for (const node of allNodes) {
        if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
          let customFills: any[] | null = null;
          const fillsOrig = node.fills;
          
          for (let i = 0; i < fillsOrig.length; i++) {
            const fill = fillsOrig[i];
            
            if (fill.type === 'SOLID') {
              const newC = transformColor(fill.color);
              if (newC) {
                if (!customFills) customFills = fastClone(fillsOrig);
                customFills![i].color = newC;
              }
            } else if (fill.type.startsWith('GRADIENT_')) {
                let changedGradient = false;
                let newStops: any[] | null = null;
                
                for (let j = 0; j < fill.gradientStops.length; j++) {
                   const c = fill.gradientStops[j].color;
                   const newC = transformColor({r: c.r, g: c.g, b: c.b});
                   if (newC) { 
                      if (!newStops) newStops = fastClone(fill.gradientStops);
                      newStops![j].color = { r: newC.r, g: newC.g, b: newC.b, a: c.a };
                      changedGradient = true;
                   }
                }
                if (changedGradient && newStops) {
                    if (!customFills) customFills = fastClone(fillsOrig);
                    customFills![i].gradientStops = newStops;
                }
            }
          }
          if (customFills) node.fills = customFills;
        }
        
        if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
          let customStrokes: any[] | null = null;
          const strokesOrig = node.strokes;
          
          for (let i = 0; i < strokesOrig.length; i++) {
            const stroke = strokesOrig[i];
            
            if (stroke.type === 'SOLID') {
              const newC = transformColor(stroke.color);
              if (newC) {
                 if (!customStrokes) customStrokes = fastClone(strokesOrig);
                 customStrokes![i].color = newC;
              }
            }
          }
          if (customStrokes) node.strokes = customStrokes;
        }
        
        count++;
        
        // Yield time-based (~60 fps) to avoid blocking the main thread while preventing artificial slowdowns
        const now = Date.now();
        if (now - lastYieldTime > 50 || count === totalNodes) {
          figma.ui.postMessage({ type: 'progress', value: Math.round((count / totalNodes) * 100) });
          // Dừng lại 1 xíu để UI kịp update thanh tiến trình, sau đó chạy tiếp
          await new Promise(resolve => setTimeout(resolve, 2));
          lastYieldTime = Date.now();
        }
      }

      figma.notify('Hue change applied!');
      figma.ui.postMessage({ type: 'complete' });

    } else if (msg.type === 'cancel') {
      figma.closePlugin();
    }
  };
}

// Runs this code if the plugin is run in FigJam
if (figma.editorType === 'figjam') {
  // This plugin will open a window to prompt the user to enter a number, and
  // it will then create that many shapes and connectors on the screen.

  // This shows the HTML page in "ui.html".
  figma.showUI(__html__);

  // Calls to "parent.postMessage" from within the HTML page will trigger this
  // callback. The callback will be passed the "pluginMessage" property of the
  // posted message.
  figma.ui.onmessage =  (msg: {type: string, count: number}) => {
    // One way of distinguishing between different types of messages sent from
    // your HTML page is to use an object with a "type" property like this.
    if (msg.type === 'create-shapes') {
      // This plugin creates shapes and connectors on the screen.
      const numberOfShapes = msg.count;

      const nodes: SceneNode[] = [];
      for (let i = 0; i < numberOfShapes; i++) {
        const shape = figma.createShapeWithText();
        // You can set shapeType to one of: 'SQUARE' | 'ELLIPSE' | 'ROUNDED_RECTANGLE' | 'DIAMOND' | 'TRIANGLE_UP' | 'TRIANGLE_DOWN' | 'PARALLELOGRAM_RIGHT' | 'PARALLELOGRAM_LEFT'
        shape.shapeType = 'ROUNDED_RECTANGLE';
        shape.x = i * (shape.width + 200);
        shape.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }];
        figma.currentPage.appendChild(shape);
        nodes.push(shape);
      }

      for (let i = 0; i < numberOfShapes - 1; i++) {
        const connector = figma.createConnector();
        connector.strokeWeight = 8;

        connector.connectorStart = {
          endpointNodeId: nodes[i].id,
          magnet: 'AUTO',
        };

        connector.connectorEnd = {
          endpointNodeId: nodes[i + 1].id,
          magnet: 'AUTO',
        };
      }

      figma.currentPage.selection = nodes;
      figma.viewport.scrollAndZoomIntoView(nodes);
    }

    // Make sure to close the plugin when you're done. Otherwise the plugin will
    // keep running, which shows the cancel button at the bottom of the screen.
    figma.closePlugin();
  };
}

// Runs this code if the plugin is run in Slides
if (figma.editorType === 'slides') {
  // This plugin will open a window to prompt the user to enter a number, and
  // it will then create that many slides on the screen.

  // This shows the HTML page in "ui.html".
  figma.showUI(__html__);

  // Calls to "parent.postMessage" from within the HTML page will trigger this
  // callback. The callback will be passed the "pluginMessage" property of the
  // posted message.
  figma.ui.onmessage =  (msg: {type: string, count: number}) => {
    // One way of distinguishing between different types of messages sent from
    // your HTML page is to use an object with a "type" property like this.
    if (msg.type === 'create-shapes') {
      // This plugin creates slides and puts the user in grid view.
      const numberOfSlides = msg.count;

      const nodes: SlideNode[] = [];
      for (let i = 0; i < numberOfSlides; i++) {
        const slide = figma.createSlide();
        nodes.push(slide);
      }

      figma.viewport.slidesView = 'grid';
      figma.currentPage.selection = nodes;
    }

    // Make sure to close the plugin when you're done. Otherwise the plugin will
    // keep running, which shows the cancel button at the bottom of the screen.
    figma.closePlugin();
  };
}

// Runs this code if the plugin is run in Buzz
if (figma.editorType === 'buzz') {
  // This plugin will open a window to prompt the user to enter a number, and
  // it will then create that many frames on the screen.

  // This shows the HTML page in "ui.html".
  figma.showUI(__html__);

  // Calls to "parent.postMessage" from within the HTML page will trigger this
  // callback. The callback will be passed the "pluginMessage" property of the
  // posted message.
  figma.ui.onmessage =  (msg: {type: string, count: number}) => {
    // One way of distinguishing between different types of messages sent from
    // your HTML page is to use an object with a "type" property like this.
    if (msg.type === 'create-shapes') {
      // This plugin creates frames and puts the user in grid view.
      const numberOfFrames = msg.count;

      const nodes: FrameNode[] = [];
      for (let i = 0; i < numberOfFrames; i++) {
        const frame = figma.buzz.createFrame();
        nodes.push(frame);
      }

      figma.viewport.canvasView = 'grid';
      figma.currentPage.selection = nodes;
      figma.viewport.scrollAndZoomIntoView(nodes);
    }

    // Make sure to close the plugin when you're done. Otherwise the plugin will
    // keep running, which shows the cancel button at the bottom of the screen.
    figma.closePlugin();
  };
}
