import { app, shell, BrowserWindow, ipcMain,session } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import sixel  from 'sixel'
import os from "os";

import pty from "node-pty";
import { log } from "console";

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false, // This disables CSP checks
      nodeIntegration:true,
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      allowRunningInsecureContent: true, 
    },
  });

  const getCurrentShell = () => {
    const shell = process.env.SHELL || process.env.COMSPEC; // COMSPEC is used on Windows
    if (!shell) {
      return "bash";
    }
  
    const shellName = shell.split('/').pop().toLowerCase(); // Extracts the shell name
    console.log(shellName)
    return shellName;
  };

  mainWindow.webContents.openDevTools();
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  const useBinary = os.platform()!== 'win32'
  var myshell = os.platform() === "win32" ? "powershell.exe" : getCurrentShell();
  var ptyProcess = pty.spawn(myshell, [], {
    name: "xterm-color",
    // cols: 10800,
    // rows: 44,
    cwd: process.env.HOME,
    env: process.env,
    encoding:useBinary?null:'utf8'
  });
  // ptyProcess.write('$SHELL');
  // mainWindow.webContents.send("terminal-incData", "neofetch");
  ptyProcess.on("data", (data) => {
    
    
    mainWindow?.webContents.send("terminal-incData", data);
//     if (data instanceof Uint8Array) {
//       console.log('Data is a Uint8Array');
//       const width = 204;
// const height = 202;
//       // const sixelData = sixel.image2sixel(data, width, height, 256, 1);
//       mainWindow?.webContents.send("terminal-incData", sixelData);
//     } else {
//       console.log('Data is NOT a Uint8Array');
//       mainWindow?.webContents.send("terminal-incData", data);
//     }
  });

  ipcMain.on("terminal-into", (event, data) => {
    ptyProcess.write(data);
    
  });
  
  const resizePty = (cols, rows) => {
    if (ptyProcess) {
      console.log(cols,rows)
      ptyProcess.resize(cols, rows);
    }
  };
  
  ipcMain.on("terminal-resize", (event, data) => {
    resizePty(data.col,data.row)
  });

  ptyProcess.on('exit', (code, signal) => {
    console.log(`Terminal exited with code ${code} and signal ${signal}`);
    ptyProcess.kill()
    mainWindow?.webContents.send("terminal-incData-exit", 'TERMINAL_EXIT'); // Send exit signal to the frontend
    
});

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on("ping", () => console.log("pong"));

  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
