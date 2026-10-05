import { createWidget, widget } from "@zos/ui";
import { APP_INFO, CREATOR_INFO, QRCODE } from "zosLoader:./about.[pf].layout.js";

Page({
  onInit() {
  },

  build() {
    // Show name and version
    createWidget(widget.TEXT, APP_INFO)
    // Show app author
    createWidget(widget.TEXT, CREATOR_INFO)
    // Show QR Code that leads to Author's portfolio
    createWidget(widget.QRCODE, QRCODE)
  },

  onDestroy() {
  },
});