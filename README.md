<h1 align="center">Color Engineer</h1>Below are the steps to get your plugin running. You can also find instructions at:

### INTRODUCE

```
 https://www.figma.com/plugin-docs/plugin-quickstart-guide/
```

The **Color Engineer** project is a powerful Figma plugin built with TypeScript that enables batch hue shifting of design elements while preserving saturation and lightness. It features an intelligent spectral color grouping system that automatically categorizes colors into 8 distinct color families (Red, Orange, Yellow, Green, Blue, Indigo, Violet, and Neutral), allowing designers to adjust multiple color tones simultaneously with precision and speed.This plugin template uses Typescript and NPM, two standard tools in creating JavaScript applications.

### NEED INSTALL

Download Node.js which comes with NPM. This will allow you to install TypeScript and other libraries. You can find the download link here:

```
  https://nodejs.org/en/download/
```

If you are familiar with JavaScript, TypeScript will look very familiar. In fact, valid JavaScript code is already valid Typescript code.

### KEY FEATURES

TypeScript adds type annotations to variables. This allows code editors such as Visual Studio Code

-  **Hue Shifting**: Shift the hue angle of selected objects while maintaining original saturation and lightness valuesto provide information about the Figma API while you are writing code, as well as help catch bugs

-  **Spectral Color Grouping**: Automatically detects and groups colors into 8 primary color familiesyou previously didn't notice.

-  **Dual Mode Interface**:

   -  Single Mode: Apply uniform hue shift to all selected objectsFor more information, visit https://www.typescriptlang.org/

   -  Individual Mode: Adjust each color spectrum independently

-  **Optimized Performance**: Lightning-fast color transformation with intelligent caching and lazy cloningUsing TypeScript requires a compiler to convert TypeScript (code.ts) into JavaScript (code.js)

-  **Real-time Progress**: Visual progress indicator for batch operationsfor the browser to run.

-  **Deep Traversal**: Processes colors in nested frames and groups

We recommend writing TypeScript code using Visual Studio code:

### INSTALL DEPENDENCIES

1. Download Visual Studio Code if you haven't already: https://code.visualstudio.com/.

````sh2. Open this directory in Visual Studio Code.

pnpm install3. Compile TypeScript to JavaScript: Run the "Terminal > Run Build Task..." menu item,

```    then select "npm: watch". You will have to do this again every time

    you reopen Visual Studio Code.

### COMPILE & BUILD

That's it! Visual Studio Code will regenerate the JavaScript file every time you save.

```sh
# development (watch mode)
npm run watch

# production build
npm run build
````

### LOAD PLUGIN IN FIGMA

1. Open Figma and go to **Menu → Plugins → Development → Import plugin from manifest**
2. Select the `manifest.json` file from this directory
3. The plugin will be loaded and ready to use

### HOW TO USE

1. Select one or more design objects in your Figma file
2. Open the **Color Engineer** plugin
3. Choose your mode:
   -  **Single Mode**: Set a target hue and apply to all selected objects
   -  **Individual Mode**: Adjust each color spectrum independently
4. Use the slider to adjust hue angles (0-360°)
5. Click **Apply Changes** to execute the transformation

### DEPLOYMENT

To share this plugin with others, you can publish it to the Figma Community:

```sh
# Follow Figma's plugin publishing guidelines
# https://www.figma.com/plugin-docs/publishing/
```

### AUTHOR

-  **NV-Phong**
-  Email: `nv.phong.dev@gmail.com`
