"use strict";

const {
    app,
    BrowserWindow
} = require("electron");

const path = require("path");


function createWindow() {

    const win = new BrowserWindow({

        width: 1100,
        height: 800,

        minWidth: 360,
        minHeight: 600,

        backgroundColor: "#f1f5f9",

        autoHideMenuBar: true,

        webPreferences: {

            nodeIntegration: false,

            contextIsolation: true,

            sandbox: true

        }

    });


    win.loadFile(
        path.join(__dirname, "index.html")
    );

}


app.whenReady().then(() => {

    createWindow();


    app.on(
        "activate",
        () => {

            if (
                BrowserWindow.getAllWindows()
                    .length === 0
            ) {

                createWindow();

            }

        }
    );

});


app.on(
    "window-all-closed",
    () => {

        if (process.platform !== "darwin") {
            app.quit();
        }

    }
);